/** Dias a partir dos quais o snapshot de referência de um artigo é "desatualizado" (spec secção 6, parâmetro). */
export const STALE_AFTER_DAYS = 90;

/**
 * Snapshot de referência: último snapshot de cada artigo até à data de corte (spec, secção 6).
 * Por agora a data de corte é a última data do facto; os filtros de período (ticket #7)
 * passarão a data de corte em `$cutoffParam` (ex.: '$1') como date_key yyyymmdd.
 *
 * Fragmento SQL reutilizável pelos KPI seguintes: devolve uma linha por artigo, com as colunas do facto
 * mais `ref_date`, `cutoff_date` e `stale`.
 */
export function referenceSnapshotsSql(cutoffParam?: string): string {
  const cutoff = cutoffParam ?? '(SELECT max(date_key) FROM fact_inventory_snapshot)';
  return `
    SELECT DISTINCT ON (f.item_sk)
           f.*, i.item_id, i.item_name,
           d.date AS ref_date,
           cd.date AS cutoff_date,
           (cd.date - d.date) > ${STALE_AFTER_DAYS} AS stale
      FROM fact_inventory_snapshot f
      JOIN dim_item i ON i.item_sk = f.item_sk
      JOIN dim_date d ON d.date_key = f.date_key
      JOIN dim_date cd ON cd.date_key = ${cutoff}
     WHERE f.date_key <= ${cutoff}
     ORDER BY f.item_sk, f.date_key DESC`;
}

/** Slug do nome do artigo para a referência `item_id:slug` (ex.: `108:xray-machine`). */
export function itemRef(itemId: number, name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['-]/g, '') // 'X-ray' -> 'xray' (convenção da spec: 108:xray-machine)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${itemId}:${slug}`;
}
