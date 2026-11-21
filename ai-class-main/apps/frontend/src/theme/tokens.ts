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

/** Linhas, preenchimentos e sombras subtis (decorativos: nunca transmitem estado). */
const SUBTLE: Record<ModeId, { line: string; fill: string; shadow: string }> = {
  consulta: { line: '#D3E7EC', fill: '#EEF6F8', shadow: '0 1px 2px rgba(11,63,74,.06), 0 4px 16px rgba(11,63,74,.05)' },
  'bloco-operatorio': { line: '#1A5662', fill: '#0E4651', shadow: 'none' },
};

function vars(m: ModeTokens, id: ModeId): string {
  return [
    `--bg:${m.bg}`,
    `--surface:${m.surface}`,
    `--text:${m.text}`,
    `--text-muted:${m.textMuted}`,
    `--border:${m.border}`,
    `--line:${SUBTLE[id].line}`,
    `--fill:${SUBTLE[id].fill}`,
    `--shadow:${SUBTLE[id].shadow}`,
    `--status-ok:${m.status.ok}`,
    `--status-atencao:${m.status.atencao}`,
    `--status-critico:${m.status.critico}`,
  ].join(';') + ';';
}

/**
 * CSS global do tema (variáveis por modo + componentes). Segue a formação de Power BI:
 * uma cor em vários tons, muito espaço em branco, KPI no topo, gráficos no meio, detalhe no fim.
 */
export function themeCss(): string {
  return `
:root { ${vars(MODES.consulta, 'consulta')} color-scheme: light; }
[data-mode="bloco-operatorio"] { ${vars(MODES['bloco-operatorio'], 'bloco-operatorio')} color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif; line-height: 1.5; font-size: 15px; -webkit-font-smoothing: antialiased; }
a { color: var(--text); text-underline-offset: 2px; }
h1, h2, h3 { line-height: 1.25; }
button { font: inherit; font-size: .875rem; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 5px 12px; cursor: pointer; transition: background .15s; }
button:hover { background: var(--fill); }
button[aria-pressed="true"] { background: var(--text); color: var(--surface); border-color: var(--text); }
:focus-visible { outline: 3px solid var(--text); outline-offset: 2px; }
table { border-collapse: collapse; width: 100%; font-size: .875rem; font-variant-numeric: tabular-nums; }
caption { caption-side: top; text-align: left; font-size: .8125rem; color: var(--text-muted); padding: 8px 10px; }
th { text-align: left; font-weight: 600; font-size: .75rem; text-transform: uppercase; letter-spacing: .03em; color: var(--text-muted); padding: 8px 10px; border-bottom: 2px solid var(--line); background: var(--surface); position: sticky; top: 0; z-index: 1; }
td { padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
tbody tr:hover td { background: var(--fill); }
.table-scroll { max-height: 380px; overflow: auto; border: 1px solid var(--line); border-radius: 10px; margin-top: 12px; }
.table-scroll table { margin: 0; }
figure { margin: 0; }
figcaption { font-size: .8125rem; color: var(--text-muted); margin-bottom: 4px; }
details > summary { cursor: pointer; }

/* Cabeçalho: marca, separadores das páginas, sinais vitais e ações */
.app-header { background: var(--surface); border-bottom: 1px solid var(--line); box-shadow: var(--shadow); }
.app-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 20px; padding: 10px 28px; max-width: 1440px; margin: 0 auto; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; text-decoration: none; letter-spacing: -.01em; line-height: 1.2; }
.brand-mark { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--text); color: var(--surface); }
.brand-mark svg { stroke: var(--surface); }
.brand small { display: block; font-weight: 400; font-size: .75rem; color: var(--text-muted); }
.nav-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.nav-tabs a { text-decoration: none; padding: 6px 14px; border-radius: 999px; font-weight: 500; color: var(--text-muted); white-space: nowrap; }
.nav-tabs a:hover { background: var(--fill); color: var(--text); }
.nav-tabs a[aria-current="page"] { background: var(--text); color: var(--surface); }
.nav-tabs .tab-step { font-size: .75rem; opacity: .8; margin-right: 6px; }
.app-nav .spacer { flex: 1; }
.nav-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

/* Barra de filtros (slicers): aplicam-se a todos os visuais da página */
.filter-wrap { background: var(--fill); border-top: 1px solid var(--line); }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: flex-end; padding: 10px 28px 12px; max-width: 1440px; margin: 0 auto; }
.filter-field { display: flex; flex-direction: column; gap: 3px; font-size: .6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
.filter-control, .profile-select select { font: inherit; font-size: .875rem; text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px; min-height: 34px; }
.filter-range { font-size: .8125rem; color: var(--text-muted); margin-left: auto; align-self: center; }

/* Página */
.app-main { padding: 24px 28px 48px; max-width: 1440px; margin: 0 auto; }
.page-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; margin: 0 0 6px; }
.page-head h1 { margin: 0; font-size: 1.75rem; letter-spacing: -.02em; }
.page-head .page-question { margin: 0; color: var(--text-muted); font-size: .9375rem; }

/* Frase-insight: a primeira coisa que o gestor lê */
.insight { margin: 0; display: flex; gap: 14px; align-items: stretch; padding: 16px 20px; border-radius: 14px; background: var(--text); color: var(--surface); font-size: 1.0625rem; font-weight: 500; line-height: 1.45; }
.insight::before { content: ""; flex: 0 0 4px; border-radius: 2px; background: var(--status-ok); }

/* Cartões KPI (estado = intensidade + ícone + forma da borda, nunca só a cor) */
.kpi-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 1000px) { .kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .kpi-strip { grid-template-columns: 1fr; } }
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 8px 0 12px; }
.kpi-card-wrap { position: relative; min-width: 0; }
.kpi-card { background: var(--surface); border: 2px solid var(--line); border-radius: 12px; padding: 14px 16px 12px; min-width: 0; height: 100%; box-shadow: var(--shadow); display: flex; flex-direction: column; }
.kpi-card[data-status="atencao"] { border: 2px dashed var(--status-atencao); }
.kpi-card[data-status="critico"] { border: 3px solid var(--status-critico); }
.kpi-card header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; color: var(--text-muted); }
.kpi-card h3 { margin: 0; font-size: .75rem; font-weight: 650; text-transform: uppercase; letter-spacing: .04em; }
.kpi-card header button { padding: 0 7px; font-size: .75rem; border-radius: 999px; border-color: var(--border); color: var(--text-muted); line-height: 1.5; }
.kpi-card > p { margin: 6px 0 0; }
.kpi-value { font-size: 1.875rem; font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.kpi-unit { margin-left: 5px; color: var(--text-muted); font-size: .875rem; }
.kpi-card > p.kpi-hint { margin: 2px 0 0; font-size: .8125rem; color: var(--text-muted); }
.kpi-card .status-indicator { margin-top: auto; padding-top: 10px; }
.status-bar { display: block; width: 100%; height: 6px; border-radius: 3px; background: var(--status-ok); margin: 0 0 6px; }
[data-status="atencao"] > .status-bar { background: var(--status-atencao); }
[data-status="critico"] > .status-bar { background: var(--status-critico); }
.status-label { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: .8125rem; }
.status-label svg { stroke: var(--status-atencao); }
[data-status="critico"] .status-label svg { stroke: var(--status-critico); }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .55; transform: scale(1.15); } }
.pulse-icon { animation: pulse 1.2s ease-in-out infinite; transform-origin: center; }
@media (prefers-reduced-motion: reduce) {
  .pulse-icon { animation: none; }
}
${ecgCss()}
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Mosaicos: cada visual é um painel; a ordem por defeito segue topo (KPI) / meio (gráficos) / fim (detalhe) */
.tile-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 0 0 16px; color: var(--text-muted); font-size: .875rem; }
.tile-error { color: var(--text); border: 2px solid var(--status-critico); border-radius: 8px; padding: 8px 12px; }
.tile-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 18px; align-items: stretch; }
.tile { grid-column: span var(--w, 12); min-height: calc((var(--h, 1) - 1) * 160px); min-width: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; box-shadow: var(--shadow); }
.tile[data-tile="insights"]:not(.tile-editing), .tile[data-tile="kpis"]:not(.tile-editing) { background: none; border: 0; padding: 0; box-shadow: none; }
.tile[data-tile="insights"]:empty { display: none; }
.tile h2 { margin: 0 0 4px; font-size: 1.0625rem; font-weight: 650; letter-spacing: -.01em; }
.tile section > p { font-size: .875rem; color: var(--text-muted); margin: 6px 0; }
.tile section + section { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
.tile-editing { border: 2px dashed var(--text); cursor: grab; }
.tile-editing[data-dragging="true"] { opacity: .5; border-style: solid; }
.tile-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin-bottom: 8px; }
.tile-controls .tile-size { color: var(--text-muted); font-size: .8125rem; flex: 1 1 100%; }
.tile-controls button:disabled { opacity: .55; cursor: not-allowed; text-decoration: line-through; }
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; background: var(--text); color: var(--surface); border: 1px solid var(--text); border-radius: 8px; padding: 7px 14px; font-weight: 600; font-size: .875rem; text-decoration: none; cursor: pointer; }
.btn-primary:hover { background: var(--text-muted); }
.btn-primary:disabled { opacity: .6; cursor: progress; }
.simulator-control { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(100px, 2fr) 72px 2.5em; align-items: center; gap: 6px 12px; margin: 10px 0; font-size: .875rem; }
.simulator-control input[type="range"] { accent-color: var(--text); width: 100%; }
.simulator-control input[type="number"], .simulator-control select { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 4px 8px; min-width: 0; }
.simulator-control select { grid-column: span 3; }
form[data-testid="simulator-form"] { background: var(--fill); border-radius: 10px; padding: 12px 14px; margin: 10px 0; }
.split-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; margin: 8px 0 20px; }
.split-2 > section, .split-2 > div > section:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.split-2 + section { margin-top: 0; padding-top: 18px; border-top: 1px solid var(--line); }
@media (max-width: 1000px) { .split-2 { grid-template-columns: 1fr; } }
.cal-months { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 12px; }
.cal-month { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
.cal-month h3 { margin: 0 0 8px; font-size: .875rem; }
.cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
.cal-wd { font-size: .6875rem; font-weight: 600; color: var(--text-muted); text-align: center; }
.cal-cell { border: 1px solid var(--line); border-radius: 5px; padding: 2px 4px; min-height: 2.4rem; font-size: .6875rem; min-width: 0; overflow: hidden; }
.cal-day { color: var(--text-muted); }
.cal-hit { border: 2px solid var(--status-critico); }
.cal-hit[data-count="1"] { background: var(--fill); }
.cal-hit[data-count="2"], .cal-hit[data-count="3"] { background: var(--line); border-width: 3px; }
.cal-items { margin: 0; padding: 0; list-style: none; }
.cal-items li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cal-items a { font-weight: 600; }
.explain-panel { position: absolute; z-index: 15; top: calc(100% + 6px); left: 0; width: min(420px, 90vw); background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; box-shadow: 0 10px 30px rgba(11,63,74,.18); font-size: .875rem; }
.explain-panel header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.explain-panel h4 { margin: 0; font-size: .9375rem; }
.explain-panel dl { margin: 8px 0 0; display: grid; grid-template-columns: max-content 1fr; gap: 6px 12px; }
.explain-panel dt { font-weight: 600; color: var(--text-muted); }
.explain-panel dd { margin: 0; }
.explain-panel ul { margin: 0; padding-left: 1.1rem; }
.kpi-strip .kpi-card-wrap:nth-child(4n) .explain-panel { left: auto; right: 0; }
[data-testid="detail-panel"] dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 12px; font-size: .875rem; }
[data-testid="detail-panel"] dt { font-weight: 600; color: var(--text-muted); }
[data-testid="detail-panel"] dd { margin: 0; }
.app-footer { padding: 14px 28px; border-top: 1px solid var(--line); background: var(--surface); color: var(--text-muted); font-size: .8125rem; }
.app-footer > * { max-width: 1440px; margin: 0 auto; }
@media (max-width: 1100px) { .tile { grid-column: span max(6, var(--w, 12)); } }
@media (max-width: 800px) { .tile { grid-column: 1 / -1; } .app-nav, .filter-bar, .app-main { padding-left: 16px; padding-right: 16px; } }
`.trim();
}
