import { apiPath, type FilterState } from '../filters/filters';
import type { TriageLevel } from './triage';

/** Linha de GET /api/reorder-suggestions. */
export interface ReorderItem {
  itemRef: string;
  name: string;
  level: TriageLevel;
  class: 'A' | 'B' | 'C';
  stock: number;
  reorderPoint: number;
  safetyStock: number;
  suggest: number;
  reason: string;
  lowConfidence: boolean;
}

export interface ReorderSuggestions {
  items: ReorderItem[];
  totals: { items: number; units: number };
  withoutConsumption: number;
}

/** Ligação de descarga do CSV com os filtros atuais (o proxy /api/* encaminha para a API). */
export const exportHref = (filters: FilterState): string => apiPath('/api/reorder-suggestions/export.csv', filters);
