export type Status = 'ok' | 'atencao' | 'critico';

/** Limiares dos dias de folga (spec K6): >= ok -> OK; critical <= x < ok -> atenção; x < critical -> crítico. */
export interface SlackThresholds {
  ok: number;
  critical: number;
}

export const DEFAULT_SLACK_THRESHOLDS: SlackThresholds = { ok: 7, critical: 0 };

/** K1: stock / consumo diário; consumo <= 0 -> indefinida (null), nunca divisão por zero. */
export const autonomyDays = (stock: number, usagePerDay: number): number | null =>
  usagePerDay > 0 ? stock / usagePerDay : null;

/** K6: autonomia - tempo de reposição; sem autonomia ou com tempo de reposição <= 0 (R12, inválido), sem folga. */
export const slackDays = (autonomy: number | null, leadTime: number): number | null =>
  autonomy === null || leadTime <= 0 ? null : autonomy - leadTime;

export const slackStatus = (slack: number, t: SlackThresholds): Status =>
  slack >= t.ok ? 'ok' : slack >= t.critical ? 'atencao' : 'critico';

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
