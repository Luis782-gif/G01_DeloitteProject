import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarView } from './CalendarView';
import { monthGrids, type CalendarItem, type ShortageCalendar } from './calendar';

const item = (o: Partial<CalendarItem>): CalendarItem => ({
  itemRef: '1:a', name: 'A', depletionDate: '2025-11-22', autonomyDays: 1.8, referenceDate: '2025-11-21', stale: false, alreadyDepleted: false, ...o,
});

test('grelha mensal: conta artigos por dia e só inclui meses com artigos', () => {
  const g = monthGrids([item({}), item({ itemRef: '2:b', depletionDate: '2025-11-22' }), item({ itemRef: '3:c', depletionDate: '2026-01-08' })]);
  assert.deepEqual(g.map((m) => m.key), ['2025-11', '2026-01']);
  // 1 nov 2025 é sábado: 5 células de preenchimento
  assert.equal(g[0].cells.filter((c) => c === null).length, 5);
  assert.equal(g[0].cells.find((c) => c?.date === '2025-11-22')?.items.length, 2);
  assert.equal(g[0].total, 2);
});

test('vista: ressalva, tabela ordenada, já esgotado com texto, sem consumo à parte', () => {
  const data: ShortageCalendar = {
    cutoffDate: '2025-12-30',
    items: [item({ alreadyDepleted: true, stale: true }), item({ itemRef: '2:b', name: 'B', depletionDate: '2026-01-08', referenceDate: '2025-12-30' })],
    noConsumption: [{ itemRef: '9:z', name: 'Z', referenceDate: '2025-12-30', stale: false }],
  };
  const html = renderToStaticMarkup(<CalendarView data={data} />);
  assert.match(html, /Assume consumo constante/);
  assert.match(html, /Já esgotado \(dado desatualizado\)/);
  assert.match(html, /Sem consumo \(1\)/);
  assert.match(html, /Como é calculado: Artigos a esgotar/);
  assert.match(html, /22\/11\/2025/);
  assert.ok(html.indexOf('22/11/2025') < html.indexOf('08/01/2026'));
});
