'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { parseFilterState, toggleFilter, type FilterKey, type FilterState } from './filters';

export interface CrossFilterValue {
  state: FilterState;
  toggle: (key: FilterKey, value: string) => void;
}

/** Por omissão (testes, fora do provider): sem filtros e sem efeito. */
export const CrossFilterContext = createContext<CrossFilterValue>({ state: {}, toggle: () => {} });
export const useCrossFilter = () => useContext(CrossFilterContext);

/** Liga o cross-filter ao URL (mesmo estado que os slicers; `detalhe` e outros parâmetros preservados). */
export function CrossFilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toggle = (key: FilterKey, value: string) => {
    const search = toggleFilter(params.toString(), key, value);
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };
  return <CrossFilterContext.Provider value={{ state: parseFilterState(params), toggle }}>{children}</CrossFilterContext.Provider>;
}

/** Botão de cross-filter: focável, ativa com Enter/Espaço; filtrado = contorno + rótulo "filtrado" + aria-pressed. */
export function FilterToggle({ filterKey, value, children }: { filterKey: FilterKey; value: string; children: ReactNode }) {
  const { state, toggle } = useCrossFilter();
  const active = state[filterKey] === value;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => toggle(filterKey, value)}
      style={{
        font: 'inherit',
        color: 'var(--text)',
        background: active ? 'var(--surface)' : 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '2px 8px',
        cursor: 'pointer',
        ...(active ? { outline: '3px solid var(--text)', outlineOffset: 1, fontWeight: 700 } : {}),
      }}
    >
      {children}
      {active && <small> (filtrado)</small>}
    </button>
  );
}
