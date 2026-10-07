'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SECTORS } from '../lib/sectors';

export default function Home() {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const filtered = query
    ? SECTORS.filter((s) =>
        (s.name + ' ' + s.blurb).toLowerCase().includes(query)
      )
    : SECTORS;

  return (
    <main className="ns-page">
      <header className="ns-hero">
        <div className="logo">
          <div className="logo-star">★</div>
          <h1>North Star</h1>
        </div>
        <p>Jay&apos;s personal OSINT dashboard — 9 sectors, real tools</p>
      </header>

      <div className="ns-search">
        <span className="icon">⌕</span>
        <input
          placeholder="Search tools…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      <div className="ns-grid">
        {filtered.map((s) => (
          <Link key={s.id} href={`/${s.id}`} className="ns-card" data-accent={s.accent}>
            <span className="chev">›</span>
            <div className="icon">{s.icon}</div>
            <h2>{s.name}</h2>
            <p>{s.blurb}</p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="ns-note" style={{ textAlign: 'center', marginTop: 32 }}>
          No tools match “{q}”.
        </p>
      )}

      <p className="ns-note" style={{ textAlign: 'center', marginTop: 28 }}>
        Everything runs on your device. Lookups hit public sources directly — no middleman.
      </p>
    </main>
  );
}
