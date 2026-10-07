'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';

const TOOLS = [
  { name: 'WHOIS (who.is)', url: (t: string) => `https://who.is/whois/${t}` },
  { name: 'DNSChecker.org', url: (t: string) => `https://dnschecker.org/#A/${t}` },
  { name: 'Shodan search', url: (t: string) => `https://www.shodan.io/search?query=${t}` },
  { name: 'Censys search', url: (t: string) => `https://search.censys.io/search?resource=hosts&q=${t}` },
  { name: 'VirusTotal', url: (t: string) => `https://www.virustotal.com/gui/search/${t}` },
  { name: 'urlscan.io', url: (t: string) => `https://urlscan.io/search/#${t}` },
  { name: 'BuiltWith', url: (t: string) => `https://builtwith.com/${t}` },
  { name: 'SecurityTrails (DNS history)', url: (t: string) => `https://securitytrails.com/domain/${t}/dns` },
  { name: 'ViewDNS.info', url: (t: string) => `https://viewdns.info/info/?domain=${t}` },
  { name: 'MXToolbox', url: (t: string) => `https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${t}&run=toolpage` },
];

export default function NetScanPage() {
  const [target, setTarget] = useState('');
  const [searched, setSearched] = useState('');
  const t = searched.trim();

  return (
    <Shell title="🌐 NetScan" sub="Network reconnaissance — domains & IPs">
      <div className="ns-panel">
        <h2>Target</h2>
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="domain.com or 1.2.3.4"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSearched(target); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={() => setSearched(target)} disabled={!target.trim()}>
            Scan
          </button>
        </div>
        <p className="ns-note">Only scan infrastructure you own or are authorized to test.</p>
      </div>

      {t && (
        <div className="ns-panel">
          <h2>Recon for “{t}” <span className="ns-tag">{TOOLS.length} tools</span></h2>
          <div className="ns-link-list">
            {TOOLS.map((x) => (
              <a key={x.name} href={x.url(encodeURIComponent(t))} target="_blank" rel="noreferrer" className="ns-link">
                <span>{x.name}</span>
                <span className="arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
