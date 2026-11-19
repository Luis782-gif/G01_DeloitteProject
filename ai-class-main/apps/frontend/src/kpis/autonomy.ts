import type { Status } from '../theme/tokens';

export interface AutonomyItem {
  itemRef: string;
  name: string;
  autonomy: number | null;
  leadTime: number;
  slack: number | null;
  status: Status | null;
  noConsumption: boolean;
  referenceDate: string;
  stale: boolean;
}

/** GET /api/kpis/autonomy */
export interface AutonomyKpi {
  median: number | null;
  unit: string;
  n: number;
  noConsumption: number;
  status: Status | null;
  itemsWithoutData: number;
  items: AutonomyItem[];
}

/** GET /api/kpis/slack-days */
export interface SlackKpi {
  median: number | null;
  unit: string;
  thresholds: { ok: number; critical: number };
  status: Status | null;
  counts: Record<Status, number>;
  n: number;
  noConsumption: number;
  itemsWithoutData: number;
  items: AutonomyItem[];
}

/** GET /api/kpis/shortage-rate */
export interface ShortageKpi {
  count: number;
  n: number;
  pct: number;
  unit: string;
  status: Status;
  noConsumption: number;
  itemsWithoutData: number;
}

export interface ScatterPoint {
  itemRef: string;
  name: string;
  /** Tempo de reposição (dias). */
  x: number;
  /** Autonomia (dias). */
  y: number;
  slack: number;
  status: Status;
}

/** Pontos da dispersão autonomia × tempo de reposição, por estado; artigos "sem consumo" ficam de fora. */
export function scatterSeries(items: AutonomyItem[]): { points: Record<Status, ScatterPoint[]>; max: number; noConsumption: number } {
  const points: Record<Status, ScatterPoint[]> = { ok: [], atencao: [], critico: [] };
  let max = 0;
  let noConsumption = 0;
  for (const i of items) {
    if (i.autonomy === null || i.slack === null || i.status === null) {
      noConsumption++;
      continue;
    }
    points[i.status].push({ itemRef: i.itemRef, name: i.name, x: i.leadTime, y: i.autonomy, slack: i.slack, status: i.status });
    max = Math.max(max, i.leadTime, i.autonomy);
  }
  return { points, max: Math.ceil(max / 5) * 5 || 5, noConsumption };
}

/** Quantos artigos estão abaixo da diagonal de folga zero (folga < 0). */
export const belowDiagonal = (items: AutonomyItem[]) => items.filter((i) => i.slack !== null && i.slack < 0).length;
