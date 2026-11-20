/**
 * Drill-through no URL (spec 8.5): `?detalhe=artigo:108:xray-machine` ou `?detalhe=fornecedor:V002`.
 * Combina-se com os restantes parâmetros (filtros globais); fechar remove só `detalhe`.
 */
import { apiPath, parseFilterState } from '../filters/filters';

export type DetailKind = 'artigo' | 'fornecedor';
export interface DetailRef {
  kind: DetailKind;
  ref: string;
}

export const DETAIL_KEY = 'detalhe';

const toSearch = (params: URLSearchParams) =>
  [...params.entries()].map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%3A/gi, ':')}`).join('&');

const asParams = (current: string | URLSearchParams) => new URLSearchParams(typeof current === 'string' ? current : current.toString());

/** Href relativo (`?...`) que abre o painel de detalhe mantendo os parâmetros atuais. */
export function detailHref(currentParams: string | URLSearchParams, kind: DetailKind, ref: string): string {
  const params = asParams(currentParams);
  params.delete(DETAIL_KEY);
  params.set(DETAIL_KEY, `${kind}:${ref}`);
  return `?${toSearch(params)}`;
}

/** Href (com `pathname`) que fecha o painel e mantém os filtros globais. */
export function closeDetailHref(currentParams: string | URLSearchParams, pathname: string): string {
  const params = asParams(currentParams);
  params.delete(DETAIL_KEY);
  const search = toSearch(params);
  return search ? `${pathname}?${search}` : pathname;
}

export function parseDetail(value: string | null | undefined): DetailRef | null {
  const m = value?.match(/^(artigo|fornecedor):(.+)$/);
  return m ? { kind: m[1] as DetailKind, ref: m[2] } : null;
}

/** Caminho da API (via proxy /api/*) para o detalhe, com os filtros globais (menos o próprio artigo/fornecedor). */
export function detailApiPath(d: DetailRef, current: URLSearchParams): string {
  const filters = parseFilterState(current);
  delete filters[d.kind === 'artigo' ? 'artigo' : 'fornecedor'];
  const base = d.kind === 'artigo' ? '/api/items/' : '/api/vendors/';
  return apiPath(`${base}${encodeURIComponent(d.ref)}`, filters);
}

