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
