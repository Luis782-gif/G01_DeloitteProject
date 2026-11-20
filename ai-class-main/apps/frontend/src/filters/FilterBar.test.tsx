import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilterBarView, periodSuggestions } from './FilterBar';

const options = {
  items: [{ itemRef: '108:xray-machine', name: 'X-ray Machine' }],
  types: ['Consumable', 'Equipment'],
  vendors: [{ vendorId: 'V002', name: 'EquipMed Co.' }],
  dateRange: { min: '2024-10-05', max: '2025-12-30' },
};

test('slicers de período, artigo, tipo e fornecedor refletem o estado vindo do URL', () => {
  const html = renderToStaticMarkup(<FilterBarView options={options} state={{ periodo: '2025-Q3', tipo: 'Equipment' }} onChange={() => {}} />);
  assert.match(html, /value="2025-Q3"/);
  assert.match(html, /<option value="Equipment" selected="">Equipment<\/option>/);
  assert.match(html, /108:xray-machine/);
  assert.match(html, /V002 · EquipMed Co\./);
  assert.match(html, /Dados de 2024-10-05 a 2025-12-30/);
});

test('sem opções (API em baixo) a barra continua a renderizar', () => {
  assert.match(renderToStaticMarkup(<FilterBarView options={null} state={{}} onChange={() => {}} />), /data-testid="filter-bar"/);
});

test('sugestões de período cobrem os anos do intervalo de dados', () => {
  assert.deepEqual(periodSuggestions({ min: '2024-10-05', max: '2025-12-30' }).slice(0, 6), ['2024', '2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025']);
  assert.deepEqual(periodSuggestions({ min: null, max: null }), []);
});
