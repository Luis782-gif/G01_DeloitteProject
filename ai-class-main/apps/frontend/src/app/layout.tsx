import { Suspense, type ReactNode } from 'react';
import { CrossFilterProvider } from '../filters/CrossFilter';
import Link from 'next/link';
import { PAGES } from './pages';
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

export const metadata = { title: 'Stock hospitalar' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const profile = parseProfile((await cookies()).get(PROFILE_COOKIE)?.value);
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
          <ProfileSelect value={profile} />
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
