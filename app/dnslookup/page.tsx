'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';
import { isValidDomain } from '../../lib/certscan';
import {
  DNS_TYPES,
  buildDohUrl,
  parseDoh,
  formatRecord,
  sortMx,
  resultSummary,
  type DnsType,
  type DnsResult,
} from '../../lib/dnsrecords';

export default function DnsLookupPage() {
  const [name, setName] = useState('');
  const [type, setType] = useState<DnsType>('A');
  const [searched, setSearched] = useState('');
  const [searchedType, setSearchedType] = useState<DnsType>('A');
  const [result, setResult] = useState<DnsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = searched.trim();

  const scan = async (tname = name, ttype: DnsType = type) => {
    const input = tname.trim().toLowerCase().replace(/\.$/, '');
    if (!input) return;
    setSearched(input);
    setSearchedType(ttype);
    setResult(null);
    setError('');
    if (!isValidDomain(input)) {
      setError('That does not look like a valid domain (e.g. example.com).');
      return;
    }
    setLoading(true);
    try {
      // Cloudflare DNS-over-HTTPS JSON endpoint — keyless, CORS-enabled.
      const r = await fetch(buildDohUrl(input, ttype), {
        headers: { accept: 'application/dns-json' },
      });
      if (!r.ok) throw new Error('DNS lookup failed');
      const j = await r.json();
      const res = parseDoh(j, ttype);
      if (res.status === 'NXDomain') throw new Error('Domain does not exist (NXDomain)');
      if (res.status !== 'NoError') throw new Error(`DNS error: ${res.status}`);
      setResult(res);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Lookup failed — try again or use the tools below.'
      );
    }
    setLoading(false);
  };

  const answers = result ? sortMx(result.answers) : [];

  const TOOLS = [
    { name: 'MXToolbox', desc: 'Full DNS report for this domain', url: `https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${t}` },
    { name: 'DNSViz', desc: 'Visual DNSSEC analysis', url: `https://dnsviz.net/d/${t}/dnssec/` },
    { name: 'Google DNS', desc: 'DoH query via Google resolvers', url: `https://dns.google/query?name=${t}&type=${searchedType}` },
  ];

  return (
    <Shell title="DNS Lookup" sub="MX, TXT, NS, A and more via DNS-over-HTTPS">
      <div className="ns-panel">
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="Domain (e.g. example.com)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') scan(); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={() => scan()} disabled={!name.trim() || loading}>
            {loading ? 'Querying…' : 'Query'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {DNS_TYPES.map((dt) => (
            <button
              key={dt}
              className="ns-btn-ghost"
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                border: type === dt ? '1px solid var(--accent)' : undefined,
                color: type === dt ? 'var(--accent)' : undefined,
              }}
              onClick={() => { setType(dt); if (name.trim()) scan(name, dt); }}
            >
              {dt}
            </button>
          ))}
        </div>
        <p className="ns-note">
          Passive DNS reads only — no zone transfers, no brute-forcing. MX/TXT
          records can reveal mail providers and verification tokens the domain
          owner published publicly.
        </p>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {t && result && (
        <div className="ns-panel">
          <h2>
            {searchedType} records
            <span className="ns-pill green" style={{ marginLeft: 8 }}>
              {resultSummary(result)}
            </span>
            {result.authoritative && (
              <span className="ns-pill" style={{ marginLeft: 6 }}>AA</span>
            )}
          </h2>
          {answers.length > 0 ? (
            <div className="ns-result">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Type</th>
                    <th style={{ textAlign: 'left' }}>Value</th>
                    <th style={{ textAlign: 'right' }}>TTL</th>
                  </tr>
                </thead>
                <tbody>
                  {answers.map((a, i) => {
                    const f = formatRecord(a);
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{f.label}</td>
                        <td
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            wordBreak: 'break-all',
                          }}
                        >
                          {f.value}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>{a.ttl}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ns-note">No {searchedType} records published for {t}.</p>
          )}
        </div>
      )}

      {t && (
        <div className="ns-panel">
          <h2>DNS tools <span className="count">{TOOLS.length}</span></h2>
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
      )}
    </Shell>
  );
}
