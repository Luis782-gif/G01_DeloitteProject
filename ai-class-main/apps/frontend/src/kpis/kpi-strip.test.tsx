import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ParetoRow } from './abc';
import type { AutonomyKpi, ShortageKpi, SlackKpi } from './autonomy';
import type { BelowMinimum } from './below-minimum';
import type { ExcessCapital, IdleStock } from './excess';
import { classAShare, KpiStripView, type KpiStripData } from './KpiStripView';
import type { LeadTime } from './lead-time';
import type { Rotation } from './rotation';

const autonomy: AutonomyKpi = { median: 6.5, unit: 'dias', n: 2, noConsumption: 1, status: 'atencao', itemsWithoutData: 2, items: [] };
const slack: SlackKpi = { median: 1.5, unit: 'dias', thresholds: { ok: 7, critical: 0 }, status: 'atencao', counts: { ok: 0, atencao: 1, critico: 1 }, n: 2, noConsumption: 1, itemsWithoutData: 2, items: [] };
const shortage: ShortageKpi = { count: 1, n: 2, pct: 50, unit: '%', status: 'critico', noConsumption: 1, itemsWithoutData: 2 };
const belowMinimum: BelowMinimum = { count: 2, eligible: 47, excluded: 3, pct: 4.26, itemsWithoutData: 0, items: [] };
const excess: ExcessCapital = {
  valueEur: 12945643.47, totalValueEur: 90098726.9, pct: 14.37, status: 'critico',
  thresholds: { okPct: 5, atencaoPct: 10 }, itemsAbove: 2, itemsWithoutData: 1, byType: [],
};
const idle: IdleStock = { days: 60, valueEur: 0, itemsOver: 0, itemsWithoutData: 0, items: [] };
const row = (itemRef: string, cls: 'A' | 'B' | 'C', cumPct: number): ParetoRow => ({ itemRef, name: itemRef, value: 1, cumPct, refCumPct: 0, class: cls });
const abc: ParetoRow[] = [row('2', 'A', 41.67), row('5', 'A', 66.67), row('8', 'B', 79.17), row('3', 'C', 100)];
const value = { secondary: true as const, rotation: 1, annualizedRotation: 4 };
const rotation: Rotation = { periodDays: 90, itemsWithoutData: 0, estimatedConsumption: 1, averageStock: 1, rotation: 14.274, annualizedRotation: 57.89, value, items: [] };
const leadTime: LeadTime = { mean: 14.4, stdDev: 7.86, cv: 0.546, observations: 5, invalid: 0, itemsWithoutData: 0, byVendor: [], byItem: [] };
const full: KpiStripData = { autonomy, slack, shortage, belowMinimum, excess, idle, abc, rotation, leadTime };

test('classAShare: % acumulada da última linha A (exemplo da aula: 002 + 005 = 66,67 %)', () => {
  assert.equal(classAShare(abc), 66.67);
  assert.equal(classAShare([row('1', 'C', 100)]), null);
});

test('faixa de KPI: os 5 mínimos do enunciado + folga, rutura prevista e capital em excesso, cada um com (i)', () => {
  const html = renderToStaticMarkup(<KpiStripView data={full} />);
  for (const label of ['Autonomia (mediana)', 'Dias de folga (mediana)', 'Rutura prevista', 'Abaixo do mínimo', 'Capital em excesso', 'Classe A (ABC)', 'Rotação do stock', 'Tempo médio de reposição']) {
    assert.match(html, new RegExp(`Como é calculado: ${label.replace(/[()]/g, '\\$&')}`), label);
  }
  assert.match(html, /6,5/);
  assert.match(html, /50,0/);
  assert.match(html, /1 de 2 artigos com folga negativa/);
  assert.match(html, /1 sem consumo/);
  assert.match(html, /4,3/);
  assert.match(html, /2 de 47 artigos elegíveis · 3 excluídos/);
  assert.match(html, /14,4/);
  assert.match(html, /2 artigos acima do máximo/);
  assert.match(html, /parado \(&gt; 60 d\)/);
  assert.match(html, /66,7 % do valor de stock · B 1 · C 1/);
  assert.match(html, /57,89/);
  assert.match(html, /14,27 × em 90 dias/);
  assert.match(html, /data-status="critico"/);
  assert.match(html, /data-status="atencao"/);
  assert.match(html, /2 artigos sem dados no período/);
});

test('faixa de KPI: API indisponível mostra n/d (nunca zero) e filtro inválido mostra a mensagem', () => {
  const none: KpiStripData = { autonomy: null, slack: null, shortage: null, belowMinimum: null, excess: null, idle: null, abc: null, rotation: null, leadTime: null };
  const html = renderToStaticMarkup(<KpiStripView data={none} />);
  assert.equal((html.match(/n\/d/g) ?? []).length, 8);
  assert.match(html, /API indisponível/);
  assert.doesNotMatch(html, /data-status=/);
  assert.match(renderToStaticMarkup(<KpiStripView data={full} error="período" />), /Filtro inválido: período/);
});
