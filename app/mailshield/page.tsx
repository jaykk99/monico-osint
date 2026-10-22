'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';
import { isValidDomain } from '../../lib/certscan';
import { buildDohUrl, parseDoh } from '../../lib/dnsrecords';
import {
  buildMailQueryNames,
  buildResult,
  fixSuggestions,
  type CheckStatus,
  type MailShieldResult,
} from '../../lib/mailshield';

const PILL: Record<CheckStatus, string> = {
  pass: 'green',
  warn: 'gold',
  fail: 'red',
  missing: 'gray',
};

export default function MailShieldPage() {
  const [domain, setDomain] = useState('');
  const [searched, setSearched] = useState('');
  const [result, setResult] = useState<MailShieldResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = searched.trim();

  const scan = async () => {
    const input = domain.trim().toLowerCase().replace(/\.$/, '');
    if (!input) return;
    setSearched(input);
    setResult(null);
    setError('');
    if (!isValidDomain(input)) {
      setError('That does not look like a valid domain (e.g. example.com).');
      return;
    }
    setLoading(true);
    try {
      const names = buildMailQueryNames(input);
      const keys = Object.keys(names) as Array<keyof typeof names>;
      const txtByCheck: Record<string, string[]> = {};
      await Promise.all(
        keys.map(async (k) => {
          const r = await fetch(buildDohUrl(names[k], 'TXT'), {
            headers: { accept: 'application/dns-json' },
          });
          if (!r.ok) throw new Error(`DNS lookup failed for ${names[k]}`);
          const j = await r.json();
          const parsed = parseDoh(j, 'TXT');
          if (parsed.status === 'NXDomain' && k === 'spf') {
            throw new Error('Domain does not exist (NXDomain)');
          }
          txtByCheck[k] = parsed.answers.map((a) => a.data);
        })
      );
      setResult(buildResult(input, txtByCheck));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lookup failed — try again.');
    }
    setLoading(false);
  };

  const fixes = result ? fixSuggestions(result) : [];

  return (
    <Shell title="MailShield" sub="Email authentication posture: SPF, DMARC, MTA-STS, TLS-RPT, BIMI">
      <div className="ns-panel">
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="Domain (e.g. example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') scan(); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={scan} disabled={!domain.trim() || loading}>
            {loading ? 'Checking…' : 'Check'}
          </button>
        </div>
        <p className="ns-note">
          Only check domains you own or are authorized to assess. Everything here
          comes from public DNS records — nothing is sent to the target.
        </p>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {result && (
        <>
          <div className="ns-panel">
            <h2>
              Posture
              <span className="ns-pill green" style={{ marginLeft: 8 }}>
                {result.grade} · {result.score}/100
              </span>
            </h2>
            <div className="ns-kv" style={{ marginTop: 8 }}>
              {result.checks.map((c) => (
                <div key={c.name}>
                  <span>{c.name}</span>
                  <b>
                    <span className={`ns-pill ${PILL[c.status]}`}>{c.status}</span>
                  </b>
                </div>
              ))}
            </div>
          </div>

          {result.checks.map((c) => (
            <div className="ns-panel" key={c.name}>
              <h2>
                {c.name}
                <span className={`ns-pill ${PILL[c.status]}`} style={{ marginLeft: 8 }}>
                  {c.status}
                </span>
              </h2>
              <p className="ns-note" style={{ marginBottom: 8 }}>{c.detail}</p>
              {c.record && (
                <div className="ns-result">
                  <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                    {c.record}
                  </div>
                </div>
              )}
            </div>
          ))}

          {fixes.length > 0 && (
            <div className="ns-panel">
              <h2>
                How to fix
                <span className="count">{fixes.length}</span>
              </h2>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 10 }}>
                {fixes.map((f, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                    {f}
                  </li>
                ))}
              </ul>
              <p className="ns-note" style={{ marginTop: 10 }}>
                Roll out SPF/DMARC gradually: publish with soft settings first,
                watch the rua reports, then tighten.
              </p>
            </div>
          )}
        </>
      )}

      {t && (
        <div className="ns-panel">
          <h2>Deep-dive tools</h2>
          <div className="ns-link-list">
            <a
              href={`https://mxtoolbox.com/SuperTool.aspx?action=spf%3a${t}`}
              target="_blank"
              rel="noreferrer"
              className="ns-link"
            >
              <span>
                <span className="name">MXToolbox SPF</span>
                <div className="desc">Independent SPF validation for {t}</div>
              </span>
              <span className="arrow">→</span>
            </a>
            <a
              href={`https://www.mail-tester.com/?lang=en`}
              target="_blank"
              rel="noreferrer"
              className="ns-link"
            >
              <span>
                <span className="name">Mail Tester</span>
                <div className="desc">Send a test email to measure your real-world score</div>
              </span>
              <span className="arrow">→</span>
            </a>
            <a
              href={`https://easydmarc.com/tools/dmarc-lookup?domain=${t}`}
              target="_blank"
              rel="noreferrer"
              className="ns-link"
            >
              <span>
                <span className="name">EasyDMARC lookup</span>
                <div className="desc">Second-opinion DMARC record parser</div>
              </span>
              <span className="arrow">→</span>
            </a>
          </div>
        </div>
      )}
    </Shell>
  );
}
