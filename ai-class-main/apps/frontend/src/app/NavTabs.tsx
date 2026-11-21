'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { PAGES } from './pages';
import { FILTER_KEYS } from '../filters/filters';

/** Separadores das 4 páginas; a página atual fica marcada (aria-current) e os filtros globais acompanham a navegação. */
export function NavTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const kept = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = params.get(k);
    if (v) kept.set(k, v);
  }
  const qs = kept.toString();
  return (
    <div className="nav-tabs">
      {PAGES.map((p, i) => (
        <Link key={p.href} href={qs ? `${p.href}?${qs}` : p.href} aria-current={pathname === p.href ? 'page' : undefined}>
          <span className="tab-step" aria-hidden="true">{i + 1}</span>
          {p.title}
        </Link>
      ))}
    </div>
  );
}
