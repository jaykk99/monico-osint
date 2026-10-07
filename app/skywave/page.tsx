import Shell from '../../components/Shell';

const SDRS = [
  { name: 'WebSDR.org index', url: 'http://www.websdr.org/', desc: 'Global index of WebSDR receivers' },
  { name: 'KiwiSDR public list', url: 'http://kiwisdr.com/public', desc: 'Community KiwiSDR receivers worldwide' },
  { name: 'rx-tx.info', url: 'https://rx-tx.info/', desc: 'SDR receiver map & directory' },
  { name: 'SDR.hu archive', url: 'https://sdr.hu/', desc: 'OpenWebRX receiver directory' },
  { name: 'Shortwave schedules (EiBi)', url: 'https://www.eibispace.de/', desc: 'Shortwave broadcast schedules' },
  { name: 'LiveATC', url: 'https://www.liveatc.net/', desc: 'Live air-traffic-control audio feeds' },
];

export default function SkywavePage() {
  return (
    <Shell title="Skywave" sub="Public software-defined radio receivers">
      <div className="ns-panel">
        <h2>SDR receivers</h2>
        <p className="desc">
          Tune real radios around the world from your browser — shortwave, ham bands, airband, marine and more.
          All receivers below are publicly shared by their operators.
        </p>
        <div className="ns-link-list">
          {SDRS.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="ns-link">
              <span><b>{s.name}</b><br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{s.desc}</span></span>
              <span className="arrow">→</span>
            </a>
          ))}
        </div>
      </div>
    </Shell>
  );
}
