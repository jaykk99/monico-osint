'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';
import {
  isValidUrl,
  buildUnshortenUrl,
  parseUnshorten,
  buildHopTable,
  suspiciousFlags,
  resolvedHost,
  type UnshortenResult,
} from '../../lib/unshorten';

export default function UnshortenPage() {
  const [url, setUrl] = useState('');
  const [searched, setSearched] = useState('');
  const [res, setRes] = useState<UnshortenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const expand = async () => {
    const input = url.trim();
    if (!input) return;
    setSearched(input);
    setRes(null);
    setError('');
    if (!isValidUrl(input)) {
      setError('Paste a full http(s) URL (e.g. https://bit.ly/abc123).');
      return;
    }
    setLoading(true);
    try {
      // unshorten.me follows the redirect chain server-side (browsers can't
      // read cross-origin Location headers) and returns the final URL.
      const r = await fetch(buildUnshortenUrl(input));
      if (!r.ok) throw new Error('Unshorten service unreachable');
      const parsed = parseUnshorten(await r.json());
      if (!parsed.success) throw new Error(parsed.error);
      setRes(parsed);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Expansion failed — try again or use the tools below.'
      );
    }
    setLoading(false);
  };

  const hops = res ? buildHopTable(res) : [];
  const flags = res ? suspiciousFlags(res.resolved) : [];
  const host = res ? resolvedHost(res.resolved) : '';

  const TOOLS = [
    { name: 'VirusTotal URL', desc: 'Reputation check on the resolved URL', url: `https://www.virustotal.com/gui/search?query=${encodeURIComponent(res?.resolved ?? '')}` },
    { name: 'URLScan.io', desc: 'Search for scans of this domain', url: `https://urlscan.io/search/#domain%3A${host}` },
    { name: 'Unshorten.app', desc: 'Manual expander if the API above fails', url: 'https://unshorten.app/' },
  ];

  return (
    <Shell title="Unshorten" sub="Expand short links and inspect the redirect chain">
      <div className="ns-panel">
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="Short URL (e.g. https://bit.ly/abc123)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') expand(); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={expand} disabled={!url.trim() || loading}>
            {loading ? 'Expanding…' : 'Expand'}
          </button>
        </div>
        <p className="ns-note">
          Never open a suspicious short link blind — expand it here first and
          read the destination before you click through anywhere else.
        </p>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {searched && res && (
        <>
          <div className="ns-panel">
            <h2>
              Redirect chain
              <span className="ns-pill green" style={{ marginLeft: 8 }}>
                {res.redirectCount !== null
                  ? `${res.redirectCount} hop${res.redirectCount === 1 ? '' : 's'}`
                  : `${hops.length - 1} hop${hops.length - 1 === 1 ? '' : 's'}`}
              </span>
            </h2>
            <div className="ns-result">
              <table>
                <tbody>
                  {hops.map((h) => (
                    <tr key={h.step}>
                      <td
                        style={{
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                          color: 'var(--muted)',
                          verticalAlign: 'top',
                        }}
                      >
                        {h.step === 0 ? 'start' : h.step === hops.length - 1 ? 'final' : `hop ${h.step}`}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                        {h.url}
                        <div style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--muted)' }}>
                          {h.note}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                        {h.step === hops.length - 1 && (
                          <a
                            href={h.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--accent)', fontSize: 12 }}
                          >
                            open →
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ns-panel">
            <h2>
              Safety flags
              <span
                className={`ns-pill ${flags.length ? 'red' : 'green'}`}
                style={{ marginLeft: 8 }}
              >
                {flags.length ? `${flags.length} found` : 'clean'}
              </span>
            </h2>
            {flags.length ? (
              <div className="ns-link-list">
                {flags.map((f) => (
                  <div key={f.label} className="ns-link" style={{ cursor: 'default' }}>
                    <span>
                      <span className="name">⚠ {f.label}</span>
                      <div className="desc">{f.detail}</div>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ns-note">
                No common phishing patterns in <b>{host}</b>. Heuristics only —
                not a safety guarantee.
              </p>
            )}
          </div>

          <div className="ns-panel">
            <h2>Reputation tools <span className="count">{TOOLS.length}</span></h2>
            <div className="ns-link-list">
              {TOOLS.map((x) => (
                <a key={x.name} href={x.url} target="_blank" rel="noreferrer" className="ns-link">
                  <span>
                    <span className="name">{x.name}</span>
                    <div className="desc">{x.desc}</div>
                  </span>
                  <span className="arrow">→</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
