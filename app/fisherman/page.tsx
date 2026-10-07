'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';

export default function FishermanPage() {
  const [dest, setDest] = useState('');
  const [label, setLabel] = useState('');
  const [short, setShort] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const make = async () => {
    const url = dest.trim();
    if (!url) return;
    setError('');
    setShort('');
    setWorking(true);
    try {
      // TinyURL simple API — free, no key, CORS-enabled
      const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
      const text = (await r.text()).trim();
      if (!r.ok || !text.startsWith('http')) throw new Error('shortener failed');
      setShort(text);
    } catch {
      setError('Could not shorten that URL — check it and try again.');
    }
    setWorking(false);
  };

  return (
    <Shell title="Fisherman" sub="Link shortener for controlled sharing">
      <div className="ns-panel">
        <h2>Shorten a link</h2>
        <div className="ns-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <input
            className="ns-input"
            placeholder="Destination URL (https://…)"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
          />
          <input
            className="ns-input"
            placeholder="Label / note (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button className="ns-btn" onClick={make} disabled={working || !dest.trim()}>
            {working ? 'Working…' : 'Generate link'}
          </button>
        </div>
        {error && <p style={{ color: 'var(--red)', fontSize: 14 }}>{error}</p>}
        {short && (
          <div className="ns-result">
            <div style={{ marginBottom: 8 }}><b style={{ color: 'var(--green)' }}>Short link ready</b></div>
            <div style={{ marginBottom: 6 }}><a href={short} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>{short}</a></div>
            {label && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Label: {label}</div>}
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>→ {dest}</div>
            <div className="ns-row" style={{ marginTop: 10 }}>
              <button className="ns-btn-ghost" onClick={() => navigator.clipboard?.writeText(short)}>
                Copy link
              </button>
              <a
                className="ns-btn-ghost"
                href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(short)}`}
                target="_blank"
                rel="noreferrer"
              >
                QR code
              </a>
            </div>
          </div>
        )}
        <p className="ns-note">
          v1 uses TinyURL for shortening. Hit logging / visitor telemetry is a v2 backend feature.
          Only share links with people you have a legitimate reason to track.
        </p>
      </div>
    </Shell>
  );
}
