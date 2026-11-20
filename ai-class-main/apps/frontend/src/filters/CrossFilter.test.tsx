import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CrossFilterContext, FilterToggle } from './CrossFilter';
import { AbcParetoView } from '../kpis/AbcParetoView';
import { ExcessBarsView } from '../kpis/ExcessBarsView';
import type { ParetoRow } from '../kpis/abc';
import type { ExcessCapital } from '../kpis/excess';

const withState = (state: Record<string, string>, ui: ReactElement) =>
  renderToStaticMarkup(<CrossFilterContext.Provider value={{ state, toggle: () => {} }}>{ui}</CrossFilterContext.Provider>);

const rows: ParetoRow[] = [
  { itemRef: '107:x', name: 'X', value: 100, cumPct: 80, refCumPct: 50, class: 'A' },
  { itemRef: '100:g', name: 'G', value: 10, cumPct: 100, refCumPct: 100, class: 'C' },
];
const excess = {
  byType: [{ type: 'Equipment', valueEur: 5e6, items: [] }],
  itemsAbove: 1,
} as unknown as ExcessCapital;

test('elemento filtrado: aria-pressed, rótulo "filtrado" e contorno (não só cor)', () => {
  const on = withState({ classe: 'A' }, <FilterToggle filterKey="classe" value="A">A</FilterToggle>);
  assert.match(on, /<button[^>]*aria-pressed="true"/);
  assert.match(on, /filtrado/);
  assert.match(on, /outline|border-style:solid/);
  const off = withState({ classe: 'B' }, <FilterToggle filterKey="classe" value="A">A</FilterToggle>);
  assert.match(off, /aria-pressed="false"/);
  assert.doesNotMatch(off, /filtrado/);
});

test('Pareto: as classes A/B/C são botões focáveis que refletem o filtro classe', () => {
  const html = withState({ classe: 'A' }, <AbcParetoView data={rows} />);
  assert.match(html, /data-testid="abc-class-filter"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-pressed="false"/);
});

test('barras de excesso: botão de filtro por tipo reflete o filtro tipo', () => {
  const html = withState({ tipo: 'Equipment' }, <ExcessBarsView data={excess} />);
  assert.match(html, /data-testid="excess-type-filter"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /filtrado/);
});
