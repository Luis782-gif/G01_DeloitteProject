/**
 * Filtros globais no frontend: ÚNICO ponto de leitura/escrita do estado no URL e de propagação à API.
 * O URL é a fonte de verdade (`?periodo=2025-Q3&tipo=Equipment`): sobrevive a recarregar e partilha-se.
 * Ponto de extensão: `classe` e `triagem` acrescentam-se a FILTER_KEYS (e ao FilterBar).
 */
export const FILTER_KEYS = ['periodo', 'artigo', 'tipo', 'fornecedor'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterState = Partial<Record<FilterKey, string>>;

type SearchSource = URLSearchParams | Record<string, string | string[] | undefined>;

/** Extrai os filtros do `searchParams` de uma página (Next) ou de um `URLSearchParams`; ignora o resto. */
export function parseFilterState(source: SearchSource): FilterState {
  const state: FilterState = {};
  for (const key of FILTER_KEYS) {
    const raw = source instanceof URLSearchParams ? source.get(key) : source[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) state[key] = value;
  }
  return state;
}

const enc = (key: string, value: string | number) => `${key}=${encodeURIComponent(String(value))}`;

/** `periodo=...&tipo=...` (ordem estável, sem `?`); '' se não há filtros. */
export function filtersToSearch(state: FilterState): string {
  return FILTER_KEYS.filter((k) => state[k]).map((k) => enc(k, state[k]!)).join('&');
}

/** Caminho da API com os filtros (e parâmetros próprios do visual) propagados: todos os visuais usam isto. */
export function apiPath(path: string, state: FilterState, extra: Record<string, string | number> = {}): string {
  const parts = [filtersToSearch(state), ...Object.entries(extra).map(([k, v]) => enc(k, v))].filter(Boolean);
  return parts.length ? `${path}?${parts.join('&')}` : path;
}

/** Novo `search` do URL com um filtro alterado (valor vazio remove-o); preserva os outros parâmetros. */
export function updateSearch(currentSearch: string, key: FilterKey, value: string): string {
  const params = new URLSearchParams(currentSearch);
  if (value) params.set(key, value);
  else params.delete(key);
  return [...params.entries()].map(([k, v]) => enc(k, v)).join('&');
}

export interface FilterOptions {
  items: { itemRef: string; name: string }[];
  types: string[];
  vendors: { vendorId: string; name: string }[];
  dateRange: { min: string | null; max: string | null };
}
