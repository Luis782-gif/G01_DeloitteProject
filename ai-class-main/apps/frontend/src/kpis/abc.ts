export type AbcClass = 'A' | 'B' | 'C';

/** Linha de GET /api/abc/pareto (spec, secção 11), por ordem decrescente de valor. */
export interface ParetoRow {
  itemRef: string;
  name: string;
  value: number;
  cumPct: number;
  refCumPct: number;
  class: AbcClass;
}

export function classCounts(rows: ParetoRow[]): Record<AbcClass, number> {
  const counts = { A: 0, B: 0, C: 0 };
  for (const r of rows) counts[r.class]++;
  return counts;
}
