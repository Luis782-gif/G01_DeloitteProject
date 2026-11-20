import { ecgCss } from '../ecg/ecg';
/** Azul-petróleo: 5 tons de intensidade (spec §9). */
export const TONES = {
  1: '#E3F1F3',
  2: '#9CCDD6',
  3: '#4A9AAA',
  4: '#1F6E7E',
  5: '#0B3F4A',
} as const;

export type Status = 'ok' | 'atencao' | 'critico';
/** Do menos ao mais intenso. */
export const STATUS_ORDER: readonly Status[] = ['ok', 'atencao', 'critico'];

export type ModeId = 'consulta' | 'bloco-operatorio';

export interface ModeTokens {
  label: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  /** Cor de cada estado: a intensidade (distância ao fundo) cresce de OK a crítico. */
  status: Record<Status, string>;
}

export const MODES: Record<ModeId, ModeTokens> = {
  consulta: {
    label: 'Consulta',
    bg: '#F3F9FA',
    surface: '#FFFFFF',
    text: TONES[5],
    textMuted: TONES[4],
    border: TONES[3],
    status: { ok: TONES[3], atencao: TONES[4], critico: TONES[5] },
  },
  'bloco-operatorio': {
    label: 'Bloco operatório',
    bg: '#072E36',
    surface: TONES[5],
    text: TONES[1],
    textMuted: TONES[2],
    border: TONES[3],
    status: { ok: TONES[3], atencao: TONES[2], critico: TONES[1] },
  },
};

export const DEFAULT_MODE: ModeId = 'consulta';

function vars(m: ModeTokens): string {
  return [
    `--bg:${m.bg}`,
    `--surface:${m.surface}`,
    `--text:${m.text}`,
    `--text-muted:${m.textMuted}`,
    `--border:${m.border}`,
    `--status-ok:${m.status.ok}`,
    `--status-atencao:${m.status.atencao}`,
    `--status-critico:${m.status.critico}`,
  ].join(';') + ';';
}

/** CSS global do tema (variáveis por modo + estilos dos componentes de estado). */
export function themeCss(): string {
  return `
:root { ${vars(MODES.consulta)} color-scheme: light; }
[data-mode="bloco-operatorio"] { ${vars(MODES['bloco-operatorio'])} color-scheme: dark; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; line-height: 1.5; }
a { color: var(--text); }
.app-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 12px 24px; background: var(--surface); border-bottom: 1px solid var(--border); }
.app-nav .spacer { flex: 1; }
.app-main { padding: 24px; max-width: 1200px; margin: 0 auto; }
button { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 4px 12px; cursor: pointer; }
:focus-visible { outline: 3px solid var(--text); outline-offset: 2px; }
.kpi-card { background: var(--surface); border: 2px solid var(--border); border-radius: 8px; padding: 16px; min-width: 200px; }
.kpi-card[data-status="atencao"] { border: 3px dashed var(--status-atencao); }
.kpi-card[data-status="critico"] { border: 6px solid var(--status-critico); }
.kpi-card header { display: flex; justify-content: space-between; align-items: center; gap: 8px; color: var(--text-muted); }
.kpi-value { font-size: 2rem; font-weight: 700; }
.kpi-unit { margin-left: 4px; color: var(--text-muted); }
.status-bar { display: block; width: 100%; height: 10px; border-radius: 5px; background: var(--status-ok); margin: 8px 0; }
[data-status="atencao"] > .status-bar { background: var(--status-atencao); }
[data-status="critico"] > .status-bar { background: var(--status-critico); }
.status-label { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.status-label svg { stroke: var(--status-atencao); }
[data-status="critico"] .status-label svg { stroke: var(--status-critico); }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .55; transform: scale(1.15); } }
.pulse-icon { animation: pulse 1.2s ease-in-out infinite; transform-origin: center; }
@media (prefers-reduced-motion: reduce) {
  .pulse-icon { animation: none; }
}
${ecgCss()}
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.profile-select select { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; }
.tile-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 8px 0 16px; color: var(--text-muted); }
.tile-error { color: var(--text); border: 2px solid var(--status-critico); border-radius: 6px; padding: 8px 12px; }
.tile-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; align-items: start; }
.tile { grid-column: span var(--w, 12); min-height: calc((var(--h, 1) - 1) * 160px); min-width: 0; }
.tile-editing { border: 2px dashed var(--text); border-radius: 8px; padding: 8px; cursor: grab; }
.tile-editing[data-dragging="true"] { opacity: .5; border-style: solid; }
.tile-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin-bottom: 8px; }
.tile-controls .tile-size { color: var(--text-muted); font-size: .875rem; flex: 1 1 100%; }
.tile-controls button:disabled { opacity: .55; cursor: not-allowed; text-decoration: line-through; }
@media (max-width: 800px) { .tile { grid-column: 1 / -1; } }
`.trim();
}
