/** Lógica pura da pesquisa global (Ctrl+K): atalho, navegação por teclado e URL do drill-through. */
import { detailHref, type DetailKind } from '../detail/detail';

export interface SearchResult {
  kind: DetailKind;
  ref: string;
  label: string;
  detail: string;
}

export const MIN_QUERY_LENGTH = 2;
export const DEBOUNCE_MS = 200;

export function isOpenShortcut(e: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }): boolean {
  return (!!e.ctrlKey || !!e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k';
}

/** Índice ativo após ↑/↓ (com volta ao fim/início). Sem resultados => -1. */
export function moveActive(index: number, count: number, key: 'ArrowDown' | 'ArrowUp'): number {
  if (count <= 0) return -1;
  if (key === 'ArrowDown') return index < 0 || index >= count - 1 ? 0 : index + 1;
  return index <= 0 ? count - 1 : index - 1;
}

export type KeyAction = { type: 'move'; index: number } | { type: 'choose'; index: number } | { type: 'close' } | { type: 'none' };

/** Tradução de uma tecla premida no campo de pesquisa para uma ação. */
export function keyAction(key: string, index: number, count: number): KeyAction {
  switch (key) {
    case 'ArrowDown':
    case 'ArrowUp':
      return { type: 'move', index: moveActive(index, count, key) };
    case 'Enter':
      return index >= 0 && index < count ? { type: 'choose', index } : { type: 'none' };
    case 'Escape':
      return { type: 'close' };
    default:
      return { type: 'none' };
  }
}

export const canSearch = (q: string): boolean => q.trim().length >= MIN_QUERY_LENGTH;

export const searchApiPath = (q: string): string => `/api/search?q=${encodeURIComponent(q.trim())}`;

/** Href (`?...detalhe=...`) do resultado, mantendo os filtros do URL atual. */
export function resultHref(currentParams: string | URLSearchParams, r: Pick<SearchResult, 'kind' | 'ref'>): string {
  return detailHref(currentParams, r.kind, r.ref);
}

export const optionId = (i: number) => `global-search-option-${i}`;
