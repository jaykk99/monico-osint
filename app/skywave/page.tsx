import Shell from '../../components/Shell';

const SDRS = [
  { name: 'WebSDR.org index', url: 'http://www.websdr.org/', desc: 'Global index of WebSDR receivers' },
  { name: 'KiwiSDR public list', url: 'http://kiwisdr.com/public', desc: 'Community KiwiSDR receivers worldwide' },
  { name: 'rx-tx.info', url: 'https://rx-tx.info/', desc: 'SDR receiver map & directory' },
  { name: 'Shortwave schedules (EiBi)', url: 'https://www.eibispace.de/', desc: 'Shortwave broadcast schedules' },
  { name: 'LiveATC', url: 'https://www.liveatc.net/', desc: 'Live air-traffic-control audio feeds' },
];

export default function SkywavePage() {
  return (
    <Shell title="Skywave" sub="Live public radio — tune in now">
      <div className="ns-panel">
        <h2>
          Live receiver
          <span className="ns-pill green" style={{ marginLeft: 8 }}>live</span>
        </h2>
        <div className="ns-embed">
          <iframe
            title="WebSDR receiver"
            src="http://websdr.ewi.utwente.nl:8901/"
            loading="lazy"
            allow="autoplay"
          />
        </div>
        <p className="ns-note">
          Live shortwave receiver at the University of Twente (Netherlands).
          Drag the waterfall to tune frequencies. If it doesn&apos;t load, try a receiver from the list below.
        </p>
      </div>

      <div className="ns-panel">
        <h2>More receivers <span className="count">{SDRS.length}</span></h2>
        <div className="ns-link-list">
          {SDRS.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="ns-link">
              <span>
                <span className="name">{s.name}</span>
                <div className="desc">{s.desc}</div>
              </span>
              <span className="arrow">→</span>
            </a>
          ))}
        </div>
      </div>
    </Shell>
  );
}
