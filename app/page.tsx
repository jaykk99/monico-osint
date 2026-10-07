'use client';

import Link from 'next/link';
import { SECTORS } from '../lib/sectors';

export default function Home() {
  return (
    <main className="ns-page">
      <header className="ns-hero">
        <h1>★ NORTH STAR</h1>
        <p>Jay&apos;s personal OSINT dashboard — 9 sectors</p>
      </header>
      <div className="ns-grid">
        {SECTORS.map((s) => (
          <Link key={s.id} href={`/${s.id}`} className="ns-card">
            <div className="icon">{s.icon}</div>
            <h2>{s.name}</h2>
            <p>{s.blurb}</p>
          </Link>
        ))}
      </div>
      <p className="ns-note" style={{ textAlign: 'center', marginTop: 24 }}>
        v1 — client-side tools + public sources. Nothing leaves your device except the lookups you run.
      </p>
    </main>
  );
}
