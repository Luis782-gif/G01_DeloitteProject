import { BadRequestException } from '@nestjs/common';
import type { Pool } from 'pg';
import { itemRef } from '../kpis/reference-snapshot';

/**
 * Filtros globais (spec 8.5 e 11), já validados e resolvidos para chaves da base.
 * Ponto de extensão: `classe` e `triagem` (tickets posteriores) entram aqui como campos novos
 * em `ResolvedFilters`, em `resolveFilters` (validação) e em `filteredSnapshots` (SQL).
 */
export interface ResolvedFilters {
  /** Início do período (yyyy-mm-dd) ou null = primeira data do facto. */
  from: string | null;
  /** Fim do período = data de corte do snapshot de referência, ou null = última data do facto. */
  to: string | null;
  itemSk: number | null;
  itemTypeId: number | null;
  vendorId: string | null;
  /** Filtro de classe ABC (A/B/C) ou null. Usa a classe calculada antes dos outros filtros. */
  classe: 'A' | 'B' | 'C' | null;
  /** Cortes ABC em % do valor acumulado (spec 7): parâmetros `cutA`/`cutB`, por defeito 80/95. */
  cutA: number;
  cutB: number;
}

/** Nomes dos parâmetros de query que um endpoint de leitura aceita como filtros. */
export const FILTER_QUERY_KEYS = ['periodo', 'artigo', 'tipo', 'fornecedor', 'classe'] as const;

const bad = (field: string, error: string) => new BadRequestException({ error, field });

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Data real yyyy-mm-dd (rejeita 2025-02-30). */
function validDate(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || iso(d) !== s ? null : s;
}

/** `2025`, `2025-Q3`, `2025-09` ou `2025-01-01..2025-03-31` -> [início, fim] inclusivos. */
export function parsePeriod(value: string): { from: string; to: string } {
  const invalid = () => bad('periodo', `Período inválido: "${value}" (use 2025, 2025-Q3, 2025-09 ou 2025-01-01..2025-03-31)`);
  let m: RegExpMatchArray | null;
  if ((m = value.match(/^(\d{4})$/))) return { from: `${m[1]}-01-01`, to: `${m[1]}-12-31` };
  if ((m = value.match(/^(\d{4})-Q([1-4])$/))) {
    const q = Number(m[2]);
    const start = new Date(Date.UTC(Number(m[1]), (q - 1) * 3, 1));
    const end = new Date(Date.UTC(Number(m[1]), q * 3, 0));
    return { from: iso(start), to: iso(end) };
  }
  if ((m = value.match(/^(\d{4})-(\d{2})$/))) {
    const month = Number(m[2]);
    if (month < 1 || month > 12) throw invalid();
    return { from: iso(new Date(Date.UTC(Number(m[1]), month - 1, 1))), to: iso(new Date(Date.UTC(Number(m[1]), month, 0))) };
  }
  if ((m = value.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/))) {
    const from = validDate(m[1]);
    const to = validDate(m[2]);
    if (!from || !to || from > to) throw invalid();
    return { from, to };
  }
  throw invalid();
}

function single(query: Record<string, unknown>, field: string): string | undefined {
  const v = query[field];
  if (v === undefined || v === '') return undefined;
  if (typeof v !== 'string') throw bad(field, `Parâmetro "${field}" repetido ou inválido`);
  return v;
}

/**
 * Interpreta e valida os parâmetros de filtro comuns de um pedido (`@Query() query`).
 * Valores inválidos ou inexistentes -> 400 `{ error, field }`.
 */
export async function resolveFilters(pool: Pool, query: Record<string, unknown>): Promise<ResolvedFilters> {
  const f: ResolvedFilters = { from: null, to: null, itemSk: null, itemTypeId: null, vendorId: null, classe: null, cutA: 80, cutB: 95 };

  const periodo = single(query, 'periodo');
  if (periodo) Object.assign(f, parsePeriod(periodo));

  const artigo = single(query, 'artigo');
  if (artigo) {
    const m = artigo.match(/^(\d+):(.+)$/);
    if (!m) throw bad('artigo', `Artigo inválido: "${artigo}" (use item_id:slug, ex.: 108:xray-machine)`);
    const rows = (await pool.query('SELECT item_sk, item_id, item_name FROM dim_item WHERE item_id = $1', [Number(m[1])])).rows;
    const hit = rows.find((r) => itemRef(r.item_id, r.item_name) === artigo);
    if (!hit) throw bad('artigo', `Artigo desconhecido: "${artigo}"`);
    f.itemSk = hit.item_sk;
  }

  const tipo = single(query, 'tipo');
  if (tipo) {
    const r = (await pool.query('SELECT item_type_id FROM dim_item_type WHERE item_type = $1', [tipo])).rows[0];
    if (!r) throw bad('tipo', `Tipo desconhecido: "${tipo}"`);
    f.itemTypeId = r.item_type_id;
  }

  const fornecedor = single(query, 'fornecedor');
  if (fornecedor) {
    const r = (await pool.query('SELECT 1 FROM dim_vendor WHERE vendor_id = $1', [fornecedor])).rowCount;
    if (!r) throw bad('fornecedor', `Fornecedor desconhecido: "${fornecedor}"`);
    f.vendorId = fornecedor;
  }

  const classe = single(query, 'classe');
  if (classe) {
    if (classe !== 'A' && classe !== 'B' && classe !== 'C') throw bad('classe', `Classe inválida: "${classe}" (use A, B ou C)`);
    f.classe = classe;
  }

  const cut = (field: 'cutA' | 'cutB') => {
    const v = single(query, field);
    if (v === undefined) return f[field];
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 100) throw bad(field, `Corte inválido: "${v}" (use um número entre 0 e 100)`);
    return n;
  };
  f.cutA = cut('cutA');
  f.cutB = cut('cutB');
  if (f.cutA >= f.cutB) throw bad('cutB', 'cutB tem de ser maior que cutA');

  return f;
}
