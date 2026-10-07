import Shell from '../../components/Shell';

const REGISTRIES: { group: string; items: { name: string; url: string; desc: string }[] }[] = [
  {
    group: 'Corporate',
    items: [
      { name: 'OpenCorporates', url: 'https://opencorporates.com/', desc: 'Largest open company database' },
      { name: 'SEC EDGAR (US)', url: 'https://www.sec.gov/cgi-bin/browse-edgar', desc: 'US company filings' },
      { name: 'Companies House (UK)', url: 'https://find-and-update.company-information.service.gov.uk/', desc: 'UK company register' },
      { name: 'Canada — Federal corporations', url: 'https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/fdrlCrpSrch.html', desc: 'Canadian federal corp search' },
    ],
  },
  {
    group: 'People & property',
    items: [
      { name: 'Whitepages (US)', url: 'https://www.whitepages.com/', desc: 'US people search' },
      { name: 'TruePeopleSearch', url: 'https://www.truepeoplesearch.com/', desc: 'Free US people lookup' },
      { name: 'Zillow', url: 'https://www.zillow.com/', desc: 'US property records' },
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
  return (
    <Shell title="Catalogue" sub="Public corporate & government registries">
      {REGISTRIES.map((g) => (
        <div className="ns-panel" key={g.group}>
          <h2>{g.group}</h2>
          <div className="ns-link-list">
            {g.items.map((x) => (
              <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="ns-link">
                <span><b>{x.name}</b><br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{x.desc}</span></span>
                <span className="arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </Shell>
  );
}
