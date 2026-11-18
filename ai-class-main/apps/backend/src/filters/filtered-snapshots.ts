import { STALE_AFTER_DAYS } from '../kpis/reference-snapshot';
import type { ResolvedFilters } from './filters';

export interface FilteredSnapshots {
  /**
   * Lista de CTE para `WITH ${ctes} SELECT ...`. Define, já filtrados:
   *  - `snaps`: snapshots do facto no período que cumprem artigo/tipo/fornecedor
   *    (colunas do facto + `snap_date`, `item_id`, `item_name`);
   *  - `ref`: snapshot de referência por artigo = último de `snaps` até ao fim do período
   *    (mesmas colunas + `ref_date`, `cutoff_date`, `stale`: > 90 dias antes da data de corte);
   *  - `no_data`: artigos (respeitando o filtro de artigo) sem nenhum snapshot no período
   *    (coluna `item_sk`); contam-se como "N artigos sem dados no período", nunca como zero;
   *  - `bounds`: `from_date`, `to_date` efetivos do período (data de corte = `to_date`).
   */
  ctes: string;
  /** Valores para os marcadores usados em `ctes`, a partir do índice pedido. */
  params: unknown[];
}

/**
 * Ponto único dos filtros globais no SQL. Cada KPI chama-o e acrescenta os seus parâmetros a seguir:
 *
 *   const f = await resolveFilters(pool, query);
 *   const q = filteredSnapshots(f);                  // ou filteredSnapshots(f, 3) se já usa $1 e $2
 *   await pool.query(`WITH ${q.ctes} SELECT ... FROM ref WHERE x > $${q.params.length + 1}`, [...q.params, x]);
 *
 * KPI sobre o histórico (rotação, tendência) usam `snaps`; KPI de estado atual usam `ref`.
 * Ponto de extensão: `classe` e `triagem` filtram `snaps`/`ref` aqui (a classe ABC calcula-se
 * sobre os artigos do período *antes* dos outros filtros, spec 8.5: usar `period_snaps`).
 */
export function filteredSnapshots(f: ResolvedFilters, firstParam = 1): FilteredSnapshots {
  const [from, to, item, type, vendor] = [0, 1, 2, 3, 4].map((i) => `$${firstParam + i}`);
  const ctes = `
    bounds AS (
      SELECT COALESCE(${from}::date, x.mn) AS from_date, COALESCE(${to}::date, x.mx) AS to_date
        FROM (SELECT min(d.date) AS mn, max(d.date) AS mx
                FROM fact_inventory_snapshot f JOIN dim_date d ON d.date_key = f.date_key) x),
    period_snaps AS (
      SELECT f.*, d.date AS snap_date, i.item_id, i.item_name
        FROM fact_inventory_snapshot f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_item i ON i.item_sk = f.item_sk
        JOIN bounds b ON d.date BETWEEN b.from_date AND b.to_date
       WHERE (${item}::int IS NULL OR f.item_sk = ${item}::int)),
    snaps AS (
      SELECT * FROM period_snaps
       WHERE (${type}::smallint IS NULL OR item_type_id = ${type}::smallint)
         AND (${vendor}::text IS NULL OR vendor_id = ${vendor}::text)),
    ref AS (
      SELECT DISTINCT ON (s.item_sk)
             s.*, s.snap_date AS ref_date, b.to_date AS cutoff_date,
             (b.to_date - s.snap_date) > ${STALE_AFTER_DAYS} AS stale
        FROM snaps s CROSS JOIN bounds b
       ORDER BY s.item_sk, s.date_key DESC),
    no_data AS (
      SELECT i.item_sk FROM dim_item i
       WHERE (${item}::int IS NULL OR i.item_sk = ${item}::int)
         AND NOT EXISTS (SELECT 1 FROM period_snaps p WHERE p.item_sk = i.item_sk))`;
  return { ctes, params: [f.from, f.to, f.itemSk, f.itemTypeId, f.vendorId] };
}
