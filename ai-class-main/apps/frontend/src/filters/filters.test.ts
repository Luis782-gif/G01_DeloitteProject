import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiPath, filtersToSearch, parseFilterState, updateSearch } from './filters';

test('lê os filtros do URL (objeto de searchParams do Next ou URLSearchParams) e ignora o resto', () => {
  assert.deepEqual(parseFilterState({ periodo: '2025-Q3', tipo: 'Equipment', detalhe: 'x', fornecedor: '' }), {
    periodo: '2025-Q3',
    tipo: 'Equipment',
  });
  assert.deepEqual(parseFilterState(new URLSearchParams('artigo=108:xray-machine&fornecedor=V002')), {
    artigo: '108:xray-machine',
    fornecedor: 'V002',
  });
  assert.deepEqual(parseFilterState({ tipo: ['A', 'B'] }), { tipo: 'A' }); // repetido: vale o primeiro
});

test('escreve os filtros numa ordem estável, com valores codificados', () => {
  assert.equal(filtersToSearch({}), '');
  assert.equal(filtersToSearch({ tipo: 'Equipment', periodo: '2025-01-01..2025-03-31' }), 'periodo=2025-01-01..2025-03-31&tipo=Equipment');
  assert.equal(filtersToSearch({ artigo: '108:xray-machine' }), 'artigo=108%3Axray-machine');
});

test('o mesmo estado produz o mesmo pedido à API (consistência entre visuais)', () => {
  const f = { periodo: '2025-Q3', tipo: 'Equipment' };
  assert.equal(apiPath('/api/kpis/below-minimum', f), '/api/kpis/below-minimum?periodo=2025-Q3&tipo=Equipment');
  assert.equal(apiPath('/api/kpis/below-minimum', f, { pageSize: 100 }), '/api/kpis/below-minimum?periodo=2025-Q3&tipo=Equipment&pageSize=100');
  assert.equal(apiPath('/api/filters/options', {}), '/api/filters/options');
});

test('alterar um filtro preserva os outros parâmetros do URL; vazio remove-o', () => {
  assert.equal(updateSearch('periodo=2025&detalhe=fornecedor:V002', 'tipo', 'Consumable'), 'periodo=2025&detalhe=fornecedor%3AV002&tipo=Consumable');
  assert.equal(updateSearch('periodo=2025&tipo=Equipment', 'periodo', ''), 'tipo=Equipment');
});
