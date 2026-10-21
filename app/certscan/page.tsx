'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';
import { isValidDomain, parseCrtsh } from '../../lib/certscan';

export default function CertScanPage() {
  const [domain, setDomain] = useState('');
  const [searched, setSearched] = useState('');
  const [subs, setSubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = searched.trim();

  const scan = async () => {
    const input = domain.trim().toLowerCase();
    if (!input) return;
    setSearched(input);
    setSubs([]);
    setError('');
    if (!isValidDomain(input)) {
      setError('That does not look like a valid domain (e.g. example.com).');
      return;
    }
    setLoading(true);
    try {
      // crt.sh is the public Certificate Transparency log search (Sectigo).
      // %25 is a URL-encoded % wildcard: match the domain and all subdomains.
      const r = await fetch(
        `https://crt.sh/?q=%25.${encodeURIComponent(input)}&output=json`
      );
      if (!r.ok) throw new Error('crt.sh lookup failed');
      const j = await r.json();
      const found = parseCrtsh(j, input);
      if (!found.length) throw new Error('No certificates found for this domain');
      setSubs(found);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Lookup failed — try again or use the tools below.'
      );
    }
    setLoading(false);
  };

  const TOOLS = [
    { name: 'crt.sh', desc: 'Raw CT log search', url: `https://crt.sh/?q=%25.${t}` },
    { name: 'Google Transparency', desc: 'Cert search (Google)', url: `https://transparencyreport.google.com/https/certificates?cert_search_auth=&cert_search_cert=&cert_search_operator=&domain=${t}` },
    { name: 'Censys', desc: 'Certificates for this domain', url: `https://search.censys.io/search?resource=certificates&q=names%3A+${t}` },
    { name: 'Shodan', desc: 'Exposed services on subdomains', url: `https://www.shodan.io/search?query=ssl%3A${t}` },
  ];

  return (
    <Shell title="Cert Scan" sub="Subdomains from public Certificate Transparency logs">
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
            {loading ? 'Scanning…' : 'Scan'}
          </button>
        </div>
        <p className="ns-note">
          Only look up domains you own or are authorized to assess. Certificates are
          public by design — this lists what the world can already see.
        </p>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {t && subs.length > 0 && (
        <div className="ns-panel">
          <h2>
            Subdomains
            <span className="ns-pill green" style={{ marginLeft: 8 }}>{subs.length}</span>
          </h2>
          <div className="ns-result">
            <table>
              <tbody>
                {subs.map((s) => (
                  <tr key={s}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s}</td>
                    <td style={{ textAlign: 'right' }}>
                      <a
                        href={`https://crt.sh/?q=%25.${encodeURIComponent(s)}&output=json`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--accent)', fontSize: 12 }}
                      >
                        certs →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {t && (
        <div className="ns-panel">
          <h2>CT tools <span className="count">{TOOLS.length}</span></h2>
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
