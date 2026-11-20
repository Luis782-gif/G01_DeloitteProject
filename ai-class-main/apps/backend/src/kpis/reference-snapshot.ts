/** Dias a partir dos quais o snapshot de referência de um artigo é "desatualizado" (spec secção 6, parâmetro). */
export const STALE_AFTER_DAYS = 90;

/*
 * O snapshot de referência (último snapshot de cada artigo até à data de corte, spec secção 6)
 * é produzido, já com os filtros globais aplicados, por `filteredSnapshots`
 * (../filters/filtered-snapshots.ts): CTE `ref` com `ref_date`, `cutoff_date` e `stale`.
 */

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
