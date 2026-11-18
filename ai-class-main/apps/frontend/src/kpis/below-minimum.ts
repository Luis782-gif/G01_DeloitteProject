import type { Status } from '../theme/tokens';

export interface BelowMinimumItem {
  itemRef: string;
  name: string;
  stock: number;
  min: number;
  referenceDate: string;
  stale: boolean;
}

/** Resposta de GET /api/kpis/below-minimum (spec, secção 11). */
export interface BelowMinimum {
  count: number;
  eligible: number;
  excluded: number;
  pct: number;
  items: BelowMinimumItem[];
}

/** Limiares da spec (K5): <= 5 % OK, <= 10 % atenção, > 10 % crítico. */
export function belowMinimumStatus(pct: number): Status {
  if (pct <= 5) return 'ok';
  if (pct <= 10) return 'atencao';
  return 'critico';
}
