import type { ReactNode } from 'react';
import { PAGES, type PageHref } from './pages';

/** Título da página (o `<h1>` vem de cada página) e a pergunta de negócio a que responde. */
export function PageHead({ href, children }: { href: PageHref; children: ReactNode }) {
  const page = PAGES.find((p) => p.href === href);
  return (
    <header className="page-head">
      {children}
      {page && <p className="page-question">{page.question}</p>}
    </header>
  );
}
