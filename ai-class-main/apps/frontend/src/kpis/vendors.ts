export interface VendorRow {
  vendorId: string;
  vendorName: string;
  mean: number | null;
  stdDev: number | null;
  /** Coeficiente de variação em razão (0,544 = 54,4 %). */
  cv: number | null;
  observations: number;
  items: number;
  itemsAtRisk: number;
  pctAtRisk: number;
  declaredDays: number | null;
  datesDays: number | null;
  risk: { ranks: { mean: number; cv: number; atRisk: number }; index: number } | null;
}

/** Resposta de GET /api/vendors. */
export interface Vendors {
  distinguishDays: number;
  distinguishes: boolean;
  distinguishText: string;
  maxDifferenceDays: number | null;
  vendors: VendorRow[];
  seasonality: { month: number; mean: number | null; observations: number }[];
}

export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Números do topo da página Porquê, tirados das linhas por fornecedor (sem novos cálculos de KPI):
 * o maior atraso real face ao prazo declarado, o fornecedor com o pior índice de risco e o com mais artigos em risco.
 */
export function vendorSummary(vendors: VendorRow[]) {
  const gaps = vendors
    .filter((v) => v.declaredDays !== null && v.datesDays !== null)
    .map((v) => ({ vendorId: v.vendorId, declared: v.declaredDays!, real: v.datesDays!, gap: v.datesDays! - v.declaredDays! }));
  const worstGap = gaps.length ? gaps.reduce((a, b) => (b.gap > a.gap ? b : a)) : null;
  const ranked = vendors.filter((v) => v.risk !== null);
  const riskiest = ranked.length ? ranked.reduce((a, b) => (b.risk!.index > a.risk!.index ? b : a)) : null;
  const mostAtRisk = vendors.length ? vendors.reduce((a, b) => (b.pctAtRisk > a.pctAtRisk ? b : a)) : null;
  return { worstGap, riskiest, mostAtRisk };
}
