'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';
import { isValidDomain } from '../../lib/certscan';
import {
  buildCdxUrl,
  parseCdx,
  earliestCapture,
  latestCapture,
  formatTimestamp,
  snapshotUrl,
  calendarUrl,
  capturesPerYear,
  type Capture,
} from '../../lib/wayback';

const SHOWN = 25;

export default function WaybackPage() {
  const [domain, setDomain] = useState('');
  const [searched, setSearched] = useState('');
  const [caps, setCaps] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = searched.trim();

  const scan = async () => {
    const input = domain.trim().toLowerCase();
    if (!input) return;
    setSearched(input);
    setCaps([]);
    setError('');
    if (!isValidDomain(input)) {
      setError('That does not look like a valid domain (e.g. example.com).');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(buildCdxUrl(input));
      if (!r.ok) throw new Error('Wayback CDX lookup failed');
      const j = await r.json();
      const found = parseCdx(j);
      if (!found.length) throw new Error('No archived captures found for this domain');
      setCaps(found);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Lookup failed — try again or use the tools below.'
      );
    }
    setLoading(false);
  };

  const first = earliestCapture(caps);
  const last = latestCapture(caps);
  const years = capturesPerYear(caps);
  const maxYear = Math.max(1, ...years.map((y) => y.count));
  const shown = caps.slice(-SHOWN).reverse();

  const TOOLS = [
    { name: 'Wayback calendar', desc: 'Full capture calendar for this domain', url: calendarUrl(t) },
    { name: 'Save Page Now', desc: 'Archive a page right now', url: 'https://web.archive.org/save/' },
    {
      name: 'Availability API',
      desc: 'Closest snapshot to a date (JSON)',
      url: `https://archive.org/wayback/available?url=${t}`,
    },
  ];

  return (
    <Shell title="Wayback" sub="Domain history from the Internet Archive's CDX index">
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
            {loading ? 'Digging…' : 'Dig'}
          </button>
        </div>
        <p className="ns-note">
          Only research domains you own or are authorized to assess. Archives are
          public by design — this shows what the Wayback Machine already saved.
        </p>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {t && caps.length > 0 && (
        <>
          <div className="ns-panel">
            <h2>
              Snapshot timeline
              <span className="ns-pill green" style={{ marginLeft: 8 }}>{caps.length}</span>
            </h2>
            <div className="ns-kv" style={{ marginBottom: 12 }}>
              <div><span>Earliest</span><b>{first ? formatTimestamp(first.timestamp) : '—'}</b></div>
              <div><span>Latest</span><b>{last ? formatTimestamp(last.timestamp) : '—'}</b></div>
            </div>
            {first && (
              <div className="ns-link-list">
                <a
                  href={snapshotUrl(first.timestamp, first.original)}
                  target="_blank"
                  rel="noreferrer"
                  className="ns-link"
                >
                  <span>
                    <span className="name">Earliest capture →</span>
                    <div className="desc">{first.original}</div>
                  </span>
                  <span className="arrow">→</span>
                </a>
                {last && last.timestamp !== first.timestamp && (
                  <a
                    href={snapshotUrl(last.timestamp, last.original)}
                    target="_blank"
                    rel="noreferrer"
                    className="ns-link"
                  >
                    <span>
                      <span className="name">Latest capture →</span>
                      <div className="desc">{last.original}</div>
                    </span>
                    <span className="arrow">→</span>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="ns-panel">
            <h2>Captures by year</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, paddingTop: 8 }}>
              {years.map((y) => (
                <div key={y.year} style={{ flex: 1, textAlign: 'center' }} title={`${y.year}: ${y.count}`}>
                  <div
                    style={{
                      height: Math.max(4, Math.round((y.count / maxYear) * 64)),
                      background: 'var(--accent)',
                      borderRadius: 3,
                      opacity: 0.75,
                    }}
                  />
                  <div style={{ fontSize: 10, marginTop: 4, color: 'var(--muted)' }}>
                    {y.year.slice(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ns-panel">
            <h2>
              Recent captures
              <span className="count">{shown.length} of {caps.length}</span>
            </h2>
            <div className="ns-result">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Date</th>
                    <th style={{ textAlign: 'left' }}>URL</th>
                    <th style={{ textAlign: 'right' }}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.timestamp + c.original}>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatTimestamp(c.timestamp)}
                      </td>
                      <td
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={c.original}
                      >
                        {c.original}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a
                          href={snapshotUrl(c.timestamp, c.original)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent)', fontSize: 12 }}
                        >
                          snapshot →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {t && (
        <div className="ns-panel">
          <h2>Archive tools <span className="count">{TOOLS.length}</span></h2>
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
