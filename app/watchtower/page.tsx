import Shell from '../../components/Shell';

const FEEDS: { group: string; items: { name: string; url: string; desc: string }[] }[] = [
  {
    group: 'Aviation',
    items: [
      { name: 'ADS-B Exchange', url: 'https://globe.adsbexchange.com/', desc: 'Unfiltered live flight tracking' },
      { name: 'Flightradar24', url: 'https://www.flightradar24.com/', desc: 'Live commercial flight map' },
      { name: 'LiveATC', url: 'https://www.liveatc.net/', desc: 'Air-traffic-control audio' },
    ],
  },
  {
    group: 'Maritime',
    items: [
      { name: 'MarineTraffic', url: 'https://www.marinetraffic.com/', desc: 'Live vessel positions' },
      { name: 'VesselFinder', url: 'https://www.vesselfinder.com/', desc: 'Ship tracking map' },
    ],
  },
  {
    group: 'Weather & space',
    items: [
      { name: 'Windy', url: 'https://www.windy.com/', desc: 'Live weather, radar, satellite' },
      { name: 'Stuff in Space', url: 'https://stuffin.space/', desc: 'Real-time satellite tracker' },
      { name: 'ISS tracker', url: 'https://isstracker.space/', desc: 'International Space Station live position' },
    ],
  },
  {
    group: 'Cyber threats',
    items: [
      { name: 'AbuseIPDB', url: 'https://www.abuseipdb.com/', desc: 'IP abuse reports & blacklist checks' },
      { name: 'ThreatFox', url: 'https://threatfox.abuse.ch/', desc: 'Malware IOC database' },
      { name: 'URLhaus', url: 'https://urlhaus.abuse.ch/', desc: 'Malicious URL feed' },
    ],
  },
];

export default function WatchtowerPage() {
  return (
    <Shell title="Watchtower" sub="Global situational awareness — live feeds">
      {FEEDS.map((g) => (
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
