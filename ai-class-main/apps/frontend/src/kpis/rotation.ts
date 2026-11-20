export interface RotationValue {
  /** Versão em valor: secundária; a principal é em unidades. */
  secondary: true;
  rotation: number | null;
  annualizedRotation: number | null;
}

export interface RotationItem {
  itemRef: string;
  name: string;
  snapshots: number;
  estimatedConsumption: number;
  averageStock: number;
  rotation: number | null;
  annualizedRotation: number | null;
  value: RotationValue;
}

/** Resposta de GET /api/kpis/rotation. */
export interface Rotation {
  periodDays: number;
  /** Artigos sem nenhum snapshot no período: rotação nula, nunca zero. */
  itemsWithoutData: number;
  estimatedConsumption: number;
  averageStock: number;
  rotation: number | null;
  annualizedRotation: number | null;
  value: RotationValue;
  items: RotationItem[];
}
