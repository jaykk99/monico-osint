'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';

interface IpInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  org?: string;
  isp?: string;
  asn?: string;
  lat?: number;
  lon?: number;
}

const isIp = (t: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(t.trim());

export default function NetScanPage() {
  const [target, setTarget] = useState('');
  const [searched, setSearched] = useState('');
  const [info, setInfo] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = searched.trim();

  const scan = async () => {
    const input = target.trim();
    if (!input) return;
    setSearched(input);
    setInfo(null);
    setError('');

    // Live IP intel — works for IPs directly; for domains we link tools below
    if (isIp(input)) {
      setLoading(true);
      try {
        const r = await fetch(`https://ip-api.com/json/${encodeURIComponent(input)}?fields=status,message,country,regionName,city,lat,lon,isp,org,as,query`);
        const j = await r.json();
        if (j.status !== 'success') throw new Error(j.message || 'lookup failed');
        setInfo({
          ip: j.query,
          city: j.city,
          region: j.regionName,
          country: j.country,
          org: j.org,
          isp: j.isp,
          asn: j.as,
          lat: j.lat,
          lon: j.lon,
        });
      } catch {
        setError('IP lookup failed — try again or use the tools below.');
      }
      setLoading(false);
    }
  };

  const TOOLS = [
    { name: 'Shodan', desc: 'Exposed services & devices', url: `https://www.shodan.io/search?query=${t}` },
    { name: 'Censys', desc: 'Host & certificate search', url: `https://search.censys.io/search?resource=hosts&q=${t}` },
    { name: 'VirusTotal', desc: 'Malware & reputation', url: `https://www.virustotal.com/gui/search/${t}` },
    { name: 'urlscan.io', desc: 'Recent scans of this target', url: `https://urlscan.io/search/#${t}` },
    { name: 'WHOIS', desc: 'Domain registration', url: `https://who.is/whois/${t}` },
    { name: 'DNSChecker', desc: 'Global DNS propagation', url: `https://dnschecker.org/#A/${t}` },
    { name: 'MXToolbox', desc: 'Mail & blacklist checks', url: `https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${t}&run=toolpage` },
    { name: 'AbuseIPDB', desc: 'Abuse reports', url: `https://www.abuseipdb.com/check/${t}` },
  ];

  return (
    <Shell title="NetScan" sub="Live network reconnaissance">
      <div className="ns-panel">
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="IP address or domain"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') scan(); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={scan} disabled={!target.trim() || loading}>
            {loading ? 'Scanning…' : 'Scan'}
          </button>
        </div>
        <p className="ns-note">Only scan infrastructure you own or are authorized to test.</p>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {t && info && (
        <div className="ns-panel">
          <h2>
            {info.ip}
            <span className="ns-pill green" style={{ marginLeft: 8 }}>live</span>
          </h2>
          <div className="ns-result">
            <table>
              <tbody>
                {info.city && <tr><td>Location</td><td>{[info.city, info.region, info.country].filter(Boolean).join(', ')}</td></tr>}
                {info.isp && <tr><td>ISP</td><td>{info.isp}</td></tr>}
                {info.org && info.org !== info.isp && <tr><td>Org</td><td>{info.org}</td></tr>}
                {info.asn && <tr><td>ASN</td><td>{info.asn}</td></tr>}
                {info.lat != null && (
                  <tr>
                    <td>Coordinates</td>
                    <td>
                      {info.lat.toFixed(4)}, {info.lon?.toFixed(4)}{' '}
                      <a href={`https://www.google.com/maps?q=${info.lat},${info.lon}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                        map →
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {t && (
        <div className="ns-panel">
          <h2>Recon tools <span className="count">{TOOLS.length}</span></h2>
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
