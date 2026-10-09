import Shell from '../../components/Shell';

const CAM_SOURCES = [
  { name: 'Windy — Webcams map', url: 'https://www.windy.com/webcams', desc: '150k+ public webcams on a world map' },
  { name: 'EarthCam', url: 'https://www.earthcam.com/', desc: 'Live streaming webcams worldwide' },
  { name: 'SkylineWebcams', url: 'https://www.skylinewebcams.com/en.html', desc: 'Live cams — cities, beaches, landmarks' },
  { name: 'WorldCam', url: 'https://worldcam.eu/', desc: 'Webcam directory by country' },
];

export default function CamerasPage() {
  return (
    <Shell title="Camera Globe" sub="Public live webcams — visual intelligence">
      <div className="ns-panel">
        <h2>Live wind & webcam map</h2>
        <div className="ns-embed">
          <iframe
            title="Windy map"
            src="https://embed.windy.com/embed2.html?lat=49.9&lon=-97.1&detailLat=49.9&detailLon=-97.1&width=650&height=450&zoom=4&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1"
            loading="lazy"
          />
        </div>
        <p className="ns-note">Windy embed — toggle the webcam layer on windy.com for the full camera map.</p>
      </div>

      <div className="ns-panel">
        <h2>Camera directories</h2>
        <div className="ns-link-list">
          {CAM_SOURCES.map((c) => (
            <a key={c.url} href={c.url} target="_blank" rel="noreferrer" className="ns-link">
              <span><b>{c.name}</b><br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{c.desc}</span></span>
              <span className="arrow">→</span>
            </a>
          ))}
        </div>
      </div>
    </Shell>
  );
}
