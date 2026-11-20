interface LeadTimeStats {
  mean: number | null;
  stdDev: number | null;
  /** Coeficiente de variação (desvio-padrão / média), em razão (0,544 = 54,4 %). */
  cv: number | null;
  observations: number;
}

/** Resposta de GET /api/kpis/lead-time (K3). Desvio-padrão populacional. */
export interface LeadTime extends LeadTimeStats {
  /** Snapshots com LT <= 0 (R12): assinalados e fora do KPI. */
  invalid: number;
  itemsWithoutData: number;
  byVendor: (LeadTimeStats & { vendorId: string; vendorName: string })[];
  byItem: (LeadTimeStats & { itemRef: string; name: string })[];
}
