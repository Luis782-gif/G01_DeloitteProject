export interface CalendarItem {
  itemRef: string;
  name: string;
  depletionDate: string;
  autonomyDays: number;
  referenceDate: string;
  stale: boolean;
  alreadyDepleted: boolean;
}
export interface NoConsumptionItem {
  itemRef: string;
  name: string;
  referenceDate: string;
  stale: boolean;
}
export interface ShortageCalendar {
  cutoffDate: string | null;
  items: CalendarItem[];
  noConsumption: NoConsumptionItem[];
}

export const CALENDAR_CAVEAT = 'Assume consumo constante.';
export const DEPLETED_LABEL = 'Já esgotado (dado desatualizado)';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const fmtDate = (iso: string) => iso.split('-').reverse().join('/');

export interface MonthGrid {
  key: string; // AAAA-MM
  label: string; // "agosto de 2025"
  /** Células da grelha (semana a começar à segunda): null = dia de preenchimento. */
  cells: Array<{ date: string; day: number; items: CalendarItem[] } | null>;
  total: number;
}

/** Agrupa os artigos por dia de esgotamento e monta uma grelha por mês (só os meses com artigos). */
export function monthGrids(items: CalendarItem[]): MonthGrid[] {
  const byMonth = new Map<string, Map<string, CalendarItem[]>>();
  for (const i of [...items].sort((a, b) => a.depletionDate.localeCompare(b.depletionDate))) {
    const m = i.depletionDate.slice(0, 7);
    const days = byMonth.get(m) ?? new Map<string, CalendarItem[]>();
    days.set(i.depletionDate, [...(days.get(i.depletionDate) ?? []), i]);
    byMonth.set(m, days);
  }
  return [...byMonth.entries()].map(([key, days]) => {
    const [y, mo] = key.split('-').map(Number);
    const lead = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
    const len = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const cells: MonthGrid['cells'] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= len; d++) {
      const date = `${key}-${String(d).padStart(2, '0')}`;
      cells.push({ date, day: d, items: days.get(date) ?? [] });
    }
    return { key, label: `${MONTHS[mo - 1]} de ${y}`, cells, total: [...days.values()].reduce((n, l) => n + l.length, 0) };
  });
}
