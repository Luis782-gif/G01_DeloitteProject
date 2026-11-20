/** Ciclo (segundos) em repouso, sem artigos em nível 5. */
export const ECG_REST_SECONDS = 4;
/** Teto de ritmo: o ciclo nunca desce daqui, para não ser agressivo. */
export const ECG_MIN_SECONDS = 1.2;
/** Nº de artigos a que o ciclo fica a meio caminho entre repouso e mínimo. */
const HALF_AT = 5;

/**
 * Duração do ciclo da linha ECG em função do nº de artigos em nível 5.
 * Pura, monótona (mais artigos = ciclo mais curto) e limitada a [ECG_MIN_SECONDS, ECG_REST_SECONDS].
 */
export function ecgCycleSeconds(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return ECG_REST_SECONDS;
  const s = ECG_MIN_SECONDS + (ECG_REST_SECONDS - ECG_MIN_SECONDS) / (1 + count / HALF_AT);
  return Math.round(s * 100) / 100;
}

/** Nº de artigos em nível 5 a partir de GET /api/triage/distribution; null se não for possível ler. */
export function level5Count(dist: { level: number; count: number }[] | null | undefined): number | null {
  const n = Array.isArray(dist) ? dist.find((l) => l.level === 5)?.count : undefined;
  return typeof n === 'number' ? n : null;
}

/** CSS da linha ECG: só `transform` (compositor, sem JS por frame); estática com prefers-reduced-motion. */
export function ecgCss(): string {
  return `
.ecg { display: inline-flex; align-items: center; gap: 10px; }
.ecg-window { display: inline-block; width: 120px; height: 24px; overflow: hidden; }
.ecg-line { display: block; width: 240px; height: 24px; fill: none; stroke: var(--text-muted); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; animation: ecg-scroll var(--ecg-cycle, 4s) linear infinite; }
.ecg-text { font-size: .875rem; color: var(--text-muted); white-space: nowrap; }
@keyframes ecg-scroll { from { transform: translateX(0); } to { transform: translateX(-120px); } }
@media (prefers-reduced-motion: reduce) {
  .ecg-line { animation: none; }
}
`.trim();
}
