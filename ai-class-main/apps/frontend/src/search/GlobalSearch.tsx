'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SearchDialog, type SearchStatus } from './SearchDialog';
import { canSearch, DEBOUNCE_MS, isOpenShortcut, keyAction, resultHref, searchApiPath, type SearchResult } from './search';

/** Botão no cabeçalho + atalho Ctrl/Cmd+K: caixa de pesquisa modal que abre o painel de detalhe. */
export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActive(-1);
    setStatus('idle');
    opener.current?.focus?.();
  }, []);

  const show = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpenShortcut(e)) return;
      e.preventDefault();
      if (!open) show();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, show]);

  // Pesquisa com debounce; o pedido anterior é cancelado.
  useEffect(() => {
    if (!open) return;
    if (!canSearch(query)) {
      setResults([]);
      setActive(-1);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(searchApiPath(query), { signal: ctrl.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((body: { results: SearchResult[] }) => {
          setResults(body.results);
          setActive(body.results.length > 0 ? 0 : -1);
          setStatus('done');
        })
        .catch((err) => {
          if ((err as Error).name !== 'AbortError') setStatus('error');
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, open]);

  const choose = (r: SearchResult) => {
    const href = resultHref(window.location.search.replace(/^\?/, ''), r);
    setOpen(false);
    setQuery('');
    setResults([]);
    setActive(-1);
    setStatus('idle');
    router.push(`${pathname}${href}`, { scroll: false });
  };

  const onKeyDown = (e: { key: string; preventDefault: () => void; stopPropagation?: () => void }) => {
    if (e.key === 'Tab') return e.preventDefault(); // foco fica no campo (diálogo modal só com teclado)
    const a = keyAction(e.key, active, results.length);
    if (a.type === 'none') return;
    e.preventDefault();
    e.stopPropagation?.(); // Esc não fecha também o painel de detalhe
    if (a.type === 'move') setActive(a.index);
    else if (a.type === 'choose') choose(results[a.index]);
    else close();
  };

  return (
    <>
      <button type="button" onClick={show} aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" data-testid="search-trigger">
        Pesquisar (Ctrl+K)
      </button>
      {open && (
        <FocusInput>
          <SearchDialog query={query} results={results} activeIndex={active} status={status} onQueryChange={setQuery} onKeyDown={onKeyDown} onChoose={choose} onClose={close} />
        </FocusInput>
      )}
    </>
  );
}

/** Dá foco ao campo de pesquisa quando o diálogo monta. */
function FocusInput({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('#global-search-input')?.focus();
  }, []);
  return <div ref={ref}>{children}</div>;
}
