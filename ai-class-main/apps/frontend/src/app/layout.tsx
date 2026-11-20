import { Suspense, type ReactNode } from 'react';
import { CrossFilterProvider } from '../filters/CrossFilter';
import Link from 'next/link';
import { PAGES } from './pages';
import { FilterBarSection } from '../filters/FilterBarSection';
import { QualityFooter } from './quality-footer';
import { DetailPanel } from '../detail/DetailPanel';
import { GlobalSearch } from '../search/GlobalSearch';
import { ModeToggle } from '../components/ModeToggle';
import { initModeScript } from '../theme/mode';
import { EcgSection } from '../ecg/EcgSection';
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
          <Suspense fallback={null}>
            <EcgSection />
          </Suspense>
          <GlobalSearch />
          <ModeToggle />
        </nav>
        <FilterBarSection />
        <Suspense fallback={null}>
          <CrossFilterProvider>
            <main className="app-main">{children}</main>
          </CrossFilterProvider>
        </Suspense>
        <Suspense fallback={null}>
          <DetailPanel />
        </Suspense>
        <QualityFooter />
      </body>
    </html>
  );
}
