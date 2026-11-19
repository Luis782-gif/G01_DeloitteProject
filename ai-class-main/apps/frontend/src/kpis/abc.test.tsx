import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AbcParetoView } from './AbcParetoView';
import { classCounts, type ParetoRow } from './abc';
import { FILTER_KEYS, parseFilterState, filtersToSearch } from '../filters/filters';
import { FilterBarView } from '../filters/FilterBar';

const rows: ParetoRow[] = [
  { itemRef: '107:xray-machine', name: 'X-ray Machine', value: 44574469.1, cumPct: 49.47, refCumPct: 20, class: 'A' },
  { itemRef: '108:gloves', name: 'Gloves', value: 27483430.5, cumPct: 79.98, refCumPct: 40, class: 'A' },
  { itemRef: '108:xray-machine', name: 'X-ray Machine', value: 13088339.55, cumPct: 94.5, refCumPct: 60, class: 'B' },
  { itemRef: '100:gloves', name: 'Gloves', value: 403118.61, cumPct: 100, refCumPct: 100, class: 'C' },
];

test('contagem por classe', () => {
  assert.deepEqual(classCounts(rows), { A: 2, B: 1, C: 1 });
});

test('o Pareto mostra a contagem por classe e a tabela de dados acessível', () => {
  const html = renderToStaticMarkup(<AbcParetoView data={rows} />);
  assert.match(html, /A: 2/);
  assert.match(html, /B: 1/);
  assert.match(html, /C: 1/);
  assert.match(html, /data-testid="abc-table"/);
  assert.match(html, /108:gloves/);
});

test('sem artigos, API em baixo e filtro inválido', () => {
  assert.match(renderToStaticMarkup(<AbcParetoView data={[]} />), /Sem artigos/);
  assert.match(renderToStaticMarkup(<AbcParetoView data={null} />), /indisponível/);
  assert.match(renderToStaticMarkup(<AbcParetoView data={null} error="Classe inválida" />), /Filtro inválido: Classe inválida/);
});

test('o filtro classe vive no URL e na barra de filtros', () => {
  assert.ok(FILTER_KEYS.includes('classe'));
  assert.deepEqual(parseFilterState(new URLSearchParams('classe=A&x=1')), { classe: 'A' });
  assert.equal(filtersToSearch({ classe: 'B', tipo: 'Equipment' }), 'tipo=Equipment&classe=B');
  const html = renderToStaticMarkup(
    <FilterBarView options={null} state={{ classe: 'B' }} onChange={() => {}} />,
  );
  assert.match(html, /<option value="B" selected="">/);
});
