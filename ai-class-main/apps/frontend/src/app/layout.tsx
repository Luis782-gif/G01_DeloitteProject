import type { ReactNode } from 'react';
import Link from 'next/link';
import { PAGES } from './pages';
import { QualityFooter } from './quality-footer';

export const metadata = { title: 'Stock hospitalar' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <nav aria-label="Páginas" style={{ display: 'flex', gap: 16, padding: 16, borderBottom: '1px solid #ddd' }}>
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href}>
              {p.title}
            </Link>
          ))}
        </nav>
        <main style={{ padding: 16 }}>{children}</main>
        <QualityFooter />
      </body>
    </html>
  );
}
