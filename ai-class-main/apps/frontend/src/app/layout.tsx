import { Suspense, type ReactNode } from 'react';
import { CrossFilterProvider } from '../filters/CrossFilter';
import { NavTabs } from './NavTabs';
import { FilterBarSection } from '../filters/FilterBarSection';
import { QualityFooter } from './quality-footer';
import { DetailPanel } from '../detail/DetailPanel';
import { GlobalSearch } from '../search/GlobalSearch';
import { ModeToggle } from '../components/ModeToggle';
import { cookies } from 'next/headers';
import { ProfileSelect } from '../layout/ProfileSelect';
import { PROFILE_COOKIE, parseProfile } from '../layout/model';
import { initModeScript } from '../theme/mode';
import { EcgSection } from '../ecg/EcgSection';
import { themeCss } from '../theme/tokens';

export const metadata = { title: 'Stock hospitalar', description: 'Dashboard de gestão de stock e prioridades de abastecimento' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const profile = parseProfile((await cookies()).get(PROFILE_COOKIE)?.value);
  return (
    <html lang="pt-PT" data-mode="consulta" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: initModeScript() }} />
      </head>
      <body>
        <header className="app-header">
          <nav aria-label="Páginas" className="app-nav">
            <a href="/" className="brand" aria-label="Stock hospitalar: início">
              <span className="brand-mark" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h5l3-8 4 16 3-8h5" />
                </svg>
              </span>
              <span>
                Stock hospitalar
                <small>Aprovisionamento e logística</small>
              </span>
            </a>
            <Suspense fallback={null}>
              <NavTabs />
            </Suspense>
            <span className="spacer" />
            <Suspense fallback={null}>
              <EcgSection />
            </Suspense>
            <div className="nav-actions">
              <GlobalSearch />
              <ProfileSelect value={profile} />
              <ModeToggle />
            </div>
          </nav>
          <div className="filter-wrap">
            <FilterBarSection />
          </div>
        </header>
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
