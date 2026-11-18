import type { ReactNode } from 'react';
import Link from 'next/link';
import { PAGES } from './pages';
import { QualityFooter } from './quality-footer';
import { ModeToggle } from '../components/ModeToggle';
import { initModeScript } from '../theme/mode';
import { themeCss } from '../theme/tokens';

export const metadata = { title: 'Stock hospitalar' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT" data-mode="consulta" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: initModeScript() }} />
      </head>
      <body>
        <nav aria-label="Páginas" className="app-nav">
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href}>
              {p.title}
            </Link>
          ))}
          <span className="spacer" />
          <ModeToggle />
        </nav>
        <main className="app-main">{children}</main>
        <QualityFooter />
      </body>
    </html>
  );
}
