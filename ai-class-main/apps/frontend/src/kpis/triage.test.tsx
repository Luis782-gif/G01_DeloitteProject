import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilterBarView } from '../filters/FilterBar';
import { FILTER_KEYS, parseFilterState, toggleFilter } from '../filters/filters';
import { TriageBadge } from './TriageBadge';
import { TriageView } from './TriageView';
import { countAtLevel, urgentItems, type TriageBucket, type TriageItem } from './triage';

const item = (over: Partial<TriageItem>): TriageItem => ({
  itemRef: '1:a', name: 'A', class: 'A', level: 5, stock: 100, usage: 72, leadTime: 2, safetyStock: 17, reorderPoint: 161,
  observations: 18, lowConfidence: false, noConsumption: false, referenceDate: '2025-01-01', stale: false, ...over,
});
const dist: TriageBucket[] = [1, 2, 3, 4, 5].map((level, i) => ({ level: level as 1, count: [5, 9, 2, 24, 10][i] }));

test('o emblema mostra sempre o número; ícone de pulso só nos níveis 4 e 5', () => {
  for (const l of [1, 2, 3, 4, 5] as const) {
    const html = renderToStaticMarkup(<TriageBadge level={l} />);
    assert.match(html, new RegExp(`${l}</span>$`));
    assert.match(html, new RegExp(`Nível de triagem ${l} de 5`));
    assert.equal(html.includes('data-icon="pulso"'), l >= 4);
  }
});

test('a vista mostra a distribuição clicável, o nº em nível 5 e a tabela dos níveis 4 e 5 com drill-through', () => {
  const items = { itemsWithoutData: 0, items: [item({ itemRef: '1:a' }), item({ itemRef: '2:b', level: 2 }), item({ itemRef: '3:c', level: 4, lowConfidence: true })] };
  assert.equal(countAtLevel(dist, 5), 10);
  assert.equal(urgentItems(items.items).length, 2);
  const html = renderToStaticMarkup(<TriageView distribution={dist} items={items} />);
  assert.match(html, /Nível 4: 24/);
  assert.match(html, /data-testid="triage-table"/);
  assert.match(html, /1:a/);
  assert.doesNotMatch(html, /2:b/);
  assert.match(html, /confiança baixa/);
});

test('estados vazio, indisponível e filtro inválido', () => {
  const zero = dist.map((b) => ({ ...b, count: 0 }));
  assert.match(renderToStaticMarkup(<TriageView distribution={zero} items={{ itemsWithoutData: 0, items: [] }} />), /Sem artigos/);
  assert.match(renderToStaticMarkup(<TriageView distribution={null} items={null} />), /indisponível/);
  assert.match(renderToStaticMarkup(<TriageView distribution={null} items={null} error="Triagem inválida" />), /Filtro inválido: Triagem inválida/);
});

test('o filtro triagem vive no URL, na barra de filtros e no cross-filter', () => {
  assert.ok(FILTER_KEYS.includes('triagem'));
  assert.deepEqual(parseFilterState(new URLSearchParams('triagem=4,5')), { triagem: '4,5' });
  assert.equal(toggleFilter('', 'triagem', '5'), 'triagem=5');
  assert.equal(toggleFilter('triagem=5', 'triagem', '5'), '');
  assert.match(renderToStaticMarkup(<FilterBarView options={null} state={{ triagem: '4,5' }} onChange={() => {}} />), /Níveis 4 e 5/);
});
