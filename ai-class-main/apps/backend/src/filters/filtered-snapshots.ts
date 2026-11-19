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
 * `classe` filtra `snaps`/`ref` aqui; a CTE `abc` (classe, valor, % acumulada de cada artigo do período)
 * calcula-se sobre `period_all` (período, *antes* de artigo/tipo/fornecedor, spec 7). `triagem` entra aqui depois.
 */
export function filteredSnapshots(f: ResolvedFilters, firstParam = 1): FilteredSnapshots {
  const [from, to, item, type, vendor, classe, cutA, cutB] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `$${firstParam + i}`);
  const ctes = `
    bounds AS (
      SELECT COALESCE(${from}::date, x.mn) AS from_date, COALESCE(${to}::date, x.mx) AS to_date
        FROM (SELECT min(d.date) AS mn, max(d.date) AS mx
                FROM fact_inventory_snapshot f JOIN dim_date d ON d.date_key = f.date_key) x),
    period_all AS (
      SELECT f.*, d.date AS snap_date, i.item_id, i.item_name
        FROM fact_inventory_snapshot f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_item i ON i.item_sk = f.item_sk
        JOIN bounds b ON d.date BETWEEN b.from_date AND b.to_date),
    abc_base AS (
      SELECT DISTINCT ON (item_sk) item_sk, item_id, item_name, (current_stock * unit_cost)::numeric AS value
        FROM period_all
       ORDER BY item_sk, date_key DESC),
    abc_cum AS (
      SELECT *, sum(value) OVER (ORDER BY value DESC, item_sk) AS cum_value,
             sum(value) OVER () AS total, row_number() OVER (ORDER BY value DESC, item_sk) AS pos,
             count(*) OVER () AS n
        FROM abc_base),
    abc AS (
      SELECT item_sk, item_id, item_name, value::float8 AS value, pos,
             CASE WHEN total > 0 THEN round(cum_value / total * 100, 2)::float8 ELSE 0 END AS cum_pct,
             round(pos * 100.0 / n, 2)::float8 AS ref_cum_pct,
             CASE WHEN value <= 0 THEN 'C'
                  WHEN pos = 1 OR cum_value / total * 100 <= ${cutA}::numeric THEN 'A'
                  WHEN cum_value / total * 100 <= ${cutB}::numeric THEN 'B'
                  ELSE 'C' END AS class
        FROM abc_cum),
    period_snaps AS (
      SELECT * FROM period_all
       WHERE (${item}::int IS NULL OR item_sk = ${item}::int)),
    snaps AS (
      SELECT * FROM period_snaps ps
       WHERE (${type}::smallint IS NULL OR item_type_id = ${type}::smallint)
         AND (${vendor}::text IS NULL OR vendor_id = ${vendor}::text)
         AND (${classe}::text IS NULL OR ps.item_sk IN (SELECT a.item_sk FROM abc a WHERE a.class = ${classe}::text))),
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
  return { ctes, params: [f.from, f.to, f.itemSk, f.itemTypeId, f.vendorId, f.classe, f.cutA, f.cutB] };
}
