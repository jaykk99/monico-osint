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
      <div className="ns-shell-head">
        <Link href="/" className="ns-back">←</Link>
        <div>
          <h1>{title}</h1>
          {sub && <p className="sub">{sub}</p>}
        </div>
      </div>
      {children}
    </main>
  );
}
