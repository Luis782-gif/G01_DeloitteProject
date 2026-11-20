export type TriageLevel = 1 | 2 | 3 | 4 | 5;

/** Linha de GET /api/triage/items. */
export interface TriageItem {
  itemRef: string;
  name: string;
  class: 'A' | 'B' | 'C';
  level: TriageLevel;
  stock: number;
  usage: number;
  leadTime: number;
  safetyStock: number | null;
  reorderPoint: number | null;
  observations: number;
  lowConfidence: boolean;
  noConsumption: boolean;
  referenceDate: string;
  stale: boolean;
}

export interface TriageItems {
  itemsWithoutData: number;
  items: TriageItem[];
}

/** Linha de GET /api/triage/distribution (5 entradas, níveis 1 a 5). */
export interface TriageBucket {
  level: TriageLevel;
  count: number;
}

/** Artigos de nível 4 e 5 (a tabela "mais urgentes"). */
export const urgentItems = (items: TriageItem[]): TriageItem[] => items.filter((i) => i.level >= 4);

export const countAtLevel = (dist: TriageBucket[], level: TriageLevel): number => dist.find((b) => b.level === level)?.count ?? 0;
