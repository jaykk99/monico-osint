import Link from 'next/link';
import type { ReactNode } from 'react';

export default function Shell({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <main className="ns-page">
      <div className="ns-topbar">
        <Link href="/" className="ns-back">←</Link>
        <div>
          <h1 className="ns-title">{title}</h1>
          {sub && <p className="ns-sub">{sub}</p>}
        </div>
      </div>
      <div style={{ paddingTop: 4 }}>{children}</div>
    </main>
  );
}
