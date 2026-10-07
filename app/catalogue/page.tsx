'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';

interface Company {
  name: string;
  jurisdiction: string;
  number: string;
  type: string;
  url: string;
}

const REGISTRIES: { group: string; items: { name: string; url: string; desc: string }[] }[] = [
  {
    group: 'Corporate',
    items: [
      { name: 'SEC EDGAR (US)', url: 'https://www.sec.gov/cgi-bin/browse-edgar', desc: 'US company filings' },
      { name: 'Companies House (UK)', url: 'https://find-and-update.company-information.service.gov.uk/', desc: 'UK company register' },
      { name: 'Canada — Federal corporations', url: 'https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/fdrlCrpSrch.html', desc: 'Canadian federal corp search' },
    ],
  },
  {
    group: 'Government & courts',
    items: [
      { name: 'PACER (US courts)', url: 'https://www.pacer.gov/', desc: 'US federal court records' },
      { name: 'CanLII', url: 'https://www.canlii.org/', desc: 'Canadian legal records' },
      { name: 'USAspending.gov', url: 'https://www.usaspending.gov/', desc: 'US federal spending data' },
    ],
  },
];

export default function CataloguePage() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearched(q);
    setResults([]);
    setError('');
    setLoading(true);
    try {
      const r = await fetch(
        `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(q)}&per_page=10`
      );
      if (!r.ok) throw new Error('search failed');
      const j = await r.json();
      const companies = (j?.results?.companies || []).map((c: any) => ({
        name: c.company?.name || '—',
        jurisdiction: c.company?.jurisdiction_code || '—',
        number: c.company?.company_number || '—',
        type: c.company?.company_type || '—',
        url: `https://opencorporates.com/companies/${c.company?.jurisdiction_code}/${c.company?.company_number}`,
      }));
      setResults(companies);
      if (!companies.length) setError('No companies found for that query.');
    } catch {
      setError('Company search failed — try again or use the registries below.');
    }
    setLoading(false);
  };

  return (
    <Shell title="Catalogue" sub="Live company search + public registries">
      <div className="ns-panel">
        <h2>Search companies</h2>
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="Company name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <button className="ns-btn" onClick={search} disabled={!query.trim() || loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        <p className="ns-note">Live search via OpenCorporates — the largest open company database.</p>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {searched && results.length > 0 && (
        <div className="ns-panel">
          <h2>
            Results for “{searched}”
            <span className="ns-pill green" style={{ marginLeft: 8 }}>live</span>
          </h2>
          <div className="ns-link-list">
            {results.map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noreferrer" className="ns-link">
                <span>
                  <span className="name">{c.name}</span>
                  <div className="desc">{c.jurisdiction} · {c.number} · {c.type}</div>
                </span>
                <span className="arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {REGISTRIES.map((g) => (
        <div className="ns-panel" key={g.group}>
          <h2>{g.group}</h2>
          <div className="ns-link-list">
            {g.items.map((x) => (
              <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="ns-link">
                <span>
                  <span className="name">{x.name}</span>
                  <div className="desc">{x.desc}</div>
                </span>
                <span className="arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </Shell>
  );
}
