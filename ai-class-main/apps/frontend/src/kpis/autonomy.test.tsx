import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AutonomyView } from './AutonomyView';
import { belowDiagonal, scatterSeries, type AutonomyItem, type AutonomyKpi, type ShortageKpi, type SlackKpi } from './autonomy';

const item = (o: Partial<AutonomyItem>): AutonomyItem => ({
  itemRef: '1:a', name: 'A', autonomy: 10, leadTime: 5, slack: 5, status: 'atencao', noConsumption: false, referenceDate: '2025-06-01', stale: false, ...o,
});
const items = [
  item({}),
  item({ itemRef: '2:b', autonomy: 3, slack: -2, status: 'critico' }),
  item({ itemRef: '3:c', autonomy: null, slack: null, status: null, noConsumption: true }),
];

test('dispersão: separa por estado, deixa de fora "sem consumo" e conta abaixo da diagonal', () => {
  const s = scatterSeries(items);
  assert.equal(s.points.atencao.length, 1);
  assert.deepEqual(s.points.critico.map((p) => [p.x, p.y]), [[5, 3]]);
  assert.equal(s.noConsumption, 1);
  assert.equal(s.max, 10);
  assert.equal(belowDiagonal(items), 1);
});

const autonomy: AutonomyKpi = { median: 6.5, unit: 'dias', n: 2, noConsumption: 1, status: 'atencao', itemsWithoutData: 2, items };
const slack: SlackKpi = { median: 1.5, unit: 'dias', thresholds: { ok: 7, critical: 0 }, status: 'atencao', counts: { ok: 0, atencao: 1, critico: 1 }, n: 2, noConsumption: 1, itemsWithoutData: 2, items };
const shortage: ShortageKpi = { count: 1, n: 2, pct: 50, unit: '%', status: 'critico', noConsumption: 1, itemsWithoutData: 2 };

test('cartões: valores, estados, (i) de cada KPI, sem consumo e sem dados no período', () => {
  const html = renderToStaticMarkup(<AutonomyView autonomy={autonomy} slack={slack} shortage={shortage} />);
  assert.match(html, /Autonomia \(mediana\)/);
  assert.match(html, /6,5/);
  assert.match(html, /Rutura prevista/);
  assert.match(html, /50,0/);
  assert.match(html, /data-status="critico"/);
  assert.match(html, /Como é calculado: Dias de folga/);
  assert.match(html, /1 de 2 artigos com folga negativa · 1 sem consumo/);
  assert.match(html, /2 artigos sem dados no período/);
});

test('API indisponível e filtro inválido', () => {
  assert.match(renderToStaticMarkup(<AutonomyView autonomy={null} slack={null} shortage={null} />), /indisponível/);
  assert.match(renderToStaticMarkup(<AutonomyView autonomy={null} slack={null} shortage={null} error="período" />), /Filtro inválido: período/);
});
