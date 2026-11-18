/// <reference types="node" />
import { apiPath, type FilterState } from './filters';

const backend = process.env.BACKEND_URL ?? 'http://localhost:3001';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string | null };

/**
 * GET à API a partir de um Server Component, com os filtros do URL propagados.
 * `message` = erro 400 da API (filtro inválido); null = API indisponível.
 */
export async function fetchWithFilters<T>(path: string, filters: FilterState, extra: Record<string, string | number> = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${backend}${apiPath(path, filters, extra)}`, { cache: 'no-store' });
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    if (res.status === 400) return { ok: false, message: ((await res.json()) as { error?: string }).error ?? 'Filtro inválido.' };
    return { ok: false, message: null };
  } catch {
    return { ok: false, message: null };
  }
}
