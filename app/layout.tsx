import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'North Star — OSINT Dashboard',
  description: "Jay's personal open-source intelligence dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
