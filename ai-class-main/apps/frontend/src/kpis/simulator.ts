import { filtersToSearch, type FilterState } from '../filters/filters';

/** Resposta de POST /api/simulations (spec 8.6): só contagens, sem previsão. */
export interface SimulationResult {
  itemsTotal: number;
  negativeSlackBefore: number;
  negativeSlackAfter: number;
  newNegativeSlack: number;
  triageBefore: { level: number; count: number }[];
  triageAfter: { level: number; count: number }[];
}

export interface Scenario {
  leadTimeDeltaDays: number;
  usageDeltaPct: number;
  vendorId?: string;
}

export const MAX_LEAD_TIME_DELTA_DAYS = 60;
export const MAX_USAGE_DELTA_PCT = 200;

/** URL do pedido (proxy /api/*) com os filtros do URL da página. */
export function simulationHref(filters: FilterState): string {
  const search = filtersToSearch(filters);
  return search ? `/api/simulations?${search}` : '/api/simulations';
}

/** Corpo do pedido; `vendorId` só vai se houver fornecedor escolhido. */
export function simulationBody(s: Scenario): Scenario {
  return { leadTimeDeltaDays: s.leadTimeDeltaDays, usageDeltaPct: s.usageDeltaPct, ...(s.vendorId ? { vendorId: s.vendorId } : {}) };
}

/** Limita um valor digitado ao intervalo permitido (vazio ou inválido = 0). */
export function clamp(value: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : 0;
}
