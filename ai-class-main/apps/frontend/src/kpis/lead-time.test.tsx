import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeadTimeView } from './LeadTimeView';

const data = {
  mean: 14.4, stdDev: 7.84, cv: 0.544, observations: 5, invalid: 1, itemsWithoutData: 0,
  byVendor: [{ vendorId: 'V001', vendorName: 'Acme', mean: 23, stdDev: 2, cv: 0.087, observations: 2 }],
  byItem: [],
};

test('cartão mostra valor e unidade, sem estado; desvio e CV por fornecedor', () => {
  const html = renderToStaticMarkup(<LeadTimeView data={data} />);
  assert.match(html, /14,4/);
  assert.match(html, /dias/);
  assert.doesNotMatch(html, /data-status/);
  assert.match(html, /54,4 %/);
  assert.match(html, /V001/);
  assert.match(html, /1 snapshot com tempo de reposição inválido/);
});

test('API indisponível: mensagem, nunca erro', () => {
  assert.match(renderToStaticMarkup(<LeadTimeView data={null} />), /indisponível/);
});
