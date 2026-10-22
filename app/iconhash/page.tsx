'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';
import {
  originOf,
  faviconCandidates,
  shodanFaviconHash,
  sha256Hex,
  shodanSearchUrl,
  hashSummary,
} from '../../lib/iconhash';

interface IconResult {
  url: string;
  size: number;
  previewUrl: string;
  murmur: number;
  sha256: string;
}

export default function IconHashPage() {
  const [site, setSite] = useState('');
  const [searched, setSearched] = useState('');
  const [result, setResult] = useState<IconResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const t = searched.trim();

  const scan = async () => {
    const input = site.trim();
    if (!input) return;
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const origin = originOf(withScheme);
    if (!origin) {
      setSearched(input);
      setResult(null);
      setError('That does not look like a valid URL.');
      return;
    }
    setSearched(input);
    setResult(null);
    setError('');
    setCopied('');
    setLoading(true);
    try {
      let lastErr = '';
      for (const cand of faviconCandidates(origin)) {
        try {
          const r = await fetch(cand);
          if (!r.ok) {
            lastErr = `${r.status} on ${cand}`;
            continue;
          }
          const buf = await r.arrayBuffer();
          const bytes = new Uint8Array(buf);
          if (!bytes.length) {
            lastErr = `empty response on ${cand}`;
            continue;
          }
          const blob = new Blob([buf]);
          setResult({
            url: cand,
            size: bytes.length,
            previewUrl: URL.createObjectURL(blob),
            murmur: shodanFaviconHash(bytes),
            sha256: await sha256Hex(bytes),
          });
          setLoading(false);
          return;
        } catch (e: unknown) {
          lastErr = e instanceof Error ? e.message : 'fetch failed';
        }
      }
      throw new Error(`No favicon found (tried ${faviconCandidates(origin).length} paths). ${lastErr}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lookup failed — try again.');
    }
    setLoading(false);
  };

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied('');
    }
  };

  return (
    <Shell title="IconHash" sub="Fingerprint a site's favicon — find its twins across the internet">
      <div className="ns-panel">
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="Site URL (e.g. example.com)"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') scan(); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={scan} disabled={!site.trim() || loading}>
            {loading ? 'Hashing…' : 'Hash'}
          </button>
        </div>
        <p className="ns-note">
          Only hash sites you own or are authorized to assess. The favicon is a
          public file; the hash finds other sites using the same icon.
        </p>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {result && (
        <>
          <div className="ns-panel">
            <h2>
              Favicon
              <span className="ns-pill green" style={{ marginLeft: 8 }}>{hashSummary(result.size)}</span>
            </h2>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8 }}>
              <img
                src={result.previewUrl}
                alt="favicon preview"
                width={48}
                height={48}
                style={{ borderRadius: 8, background: '#fff', padding: 4, imageRendering: 'pixelated' }}
              />
              <div className="ns-note" style={{ wordBreak: 'break-all' }}>
                Fetched from<br />
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{result.url}</span>
              </div>
            </div>
          </div>

          <div className="ns-panel">
            <h2>Hashes</h2>
            <div className="ns-kv">
              <div>
                <span>Shodan favicon hash</span>
                <b style={{ fontFamily: 'monospace' }}>{result.murmur}</b>
              </div>
              <div>
                <span>SHA-256</span>
                <b style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                  {result.sha256}
                </b>
              </div>
            </div>
            <div className="ns-row" style={{ marginTop: 12 }}>
              <button className="ns-btn-ghost ns-btn" onClick={() => copy('murmur', String(result.murmur))}>
                {copied === 'murmur' ? 'Copied!' : 'Copy Shodan hash'}
              </button>
              <button className="ns-btn-ghost ns-btn" onClick={() => copy('sha', result.sha256)}>
                {copied === 'sha' ? 'Copied!' : 'Copy SHA-256'}
              </button>
            </div>
          </div>

          <div className="ns-panel">
            <h2>Find its twins</h2>
            <div className="ns-link-list">
              <a
                href={shodanSearchUrl(result.murmur)}
                target="_blank"
                rel="noreferrer"
                className="ns-link"
              >
                <span>
                  <span className="name">Shodan →</span>
                  <div className="desc">
                    Every host on the internet with this favicon hash — same vendor, clone, or phishing kit
                  </div>
                </span>
                <span className="arrow">→</span>
              </a>
              <a
                href={`https://www.google.com/searchbyimage?image_url=${encodeURIComponent(result.url)}`}
                target="_blank"
                rel="noreferrer"
                className="ns-link"
              >
                <span>
                  <span className="name">Google Lens →</span>
                  <div className="desc">Reverse-image search the icon itself</div>
                </span>
                <span className="arrow">→</span>
              </a>
            </div>
            <p className="ns-note" style={{ marginTop: 10 }}>
              Shodan computes the hash over the base64-encoded icon — the murmur
              value above matches that scheme exactly, so it pastes straight
              into <span style={{ fontFamily: 'monospace' }}>http.favicon.hash:</span> searches.
            </p>
          </div>
        </>
      )}

      {t && !result && !loading && !error && (
        <div className="ns-panel">
          <p className="ns-note">No results yet — hit Hash to fetch the favicon.</p>
        </div>
      )}
    </Shell>
  );
}
