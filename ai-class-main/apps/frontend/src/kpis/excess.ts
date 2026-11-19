import type { Status } from '../theme/tokens';

export interface ExcessItem {
  itemRef: string;
  name: string;
  excessUnits: number;
  valueEur: number;
}
export interface ExcessType {
  type: string;
  valueEur: number;
  items: ExcessItem[];
}

/** Resposta de GET /api/kpis/excess-capital (K7). */
export interface ExcessCapital {
  valueEur: number;
  totalValueEur: number;
  pct: number;
  status: Status;
  thresholds: { okPct: number; atencaoPct: number };
  itemsAbove: number;
  itemsWithoutData: number;
  byType: ExcessType[];
}

/** Resposta de GET /api/kpis/idle-stock (K7b). */
export interface IdleStock {
  days: number;
  valueEur: number;
  itemsOver: number;
  itemsWithoutData: number;
  items: { itemRef: string; name: string; idleUnits: number; valueEur: number }[];
}

export interface BarRow {
  key: string;
  label: string;
  valueEur: number;
  /** Tipo (nível 1) ou artigo (nível 2, a seguir ao tipo expandido). */
  level: 'tipo' | 'artigo';
  type: string;
}

/** Linhas das barras: um tipo por barra; o tipo expandido mostra os seus artigos a seguir. */
export function barRows(byType: ExcessType[], expanded: string | null): BarRow[] {
  return byType.flatMap((t) => [
    { key: `t:${t.type}`, label: t.type, valueEur: t.valueEur, level: 'tipo' as const, type: t.type },
    ...(t.type === expanded
      ? t.items.map((i) => ({ key: `a:${i.itemRef}`, label: i.itemRef, valueEur: i.valueEur, level: 'artigo' as const, type: t.type }))
      : []),
  ]);
}

export const fmtEur = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const fmtPct = (n: number) => n.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
