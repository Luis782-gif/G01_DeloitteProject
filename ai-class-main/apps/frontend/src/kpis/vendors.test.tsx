import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { VendorsView } from './VendorsView';
import { vendorSummary, type Vendors } from './vendors';

const vendor = (id: string, over: object) => ({
  vendorId: id, vendorName: id, mean: 15, stdDev: 8, cv: 0.53, observations: 100, items: 10, itemsAtRisk: 2, pctAtRisk: 20,
  declaredDays: 5, datesDays: 5, risk: { ranks: { mean: 1, cv: 2, atRisk: 3 }, index: 2 }, ...over,
});
const data: Vendors = {
  distinguishDays: 1, distinguishes: false, maxDifferenceDays: 0.7,
  distinguishText: 'Nenhum fornecedor se distingue no tempo médio de reposição: a diferença é de 0,7 dias.',
  vendors: [vendor('V001', {}), vendor('V002', { declaredDays: 30, datesDays: 44, mean: 14.85 }), vendor('V003', { declaredDays: 15, datesDays: 20 })],
  seasonality: [{ month: 1, mean: 10, observations: 20 }],
};

test('frase de honestidade, tabela prometido vs. real e índice com componentes', () => {
  const html = renderToStaticMarkup(<VendorsView data={data} filters={{}} />);
  assert.match(html, /Nenhum fornecedor se distingue/);
  assert.match(html, /30<\/td><td[^>]*>44/);
  assert.match(html, /15<\/td><td[^>]*>20/);
  assert.match(html, /vendor-risk-table/);
});

test('ressalva de base fraca na sazonalidade e links de drill-through com filtros', () => {
  const html = renderToStaticMarkup(<VendorsView data={data} filters={{ tipo: 'Equipment' }} />);
  assert.match(html, /10 observações por artigo/);
  assert.match(html, /href="\?tipo=Equipment&amp;detalhe=fornecedor:V002"/);
});

test('API indisponível: mensagem', () => {
  assert.match(renderToStaticMarkup(<VendorsView data={null} filters={{}} />), /indisponível/);
});

test('topo da página: maior atraso face ao prometido (V002: 44 − 30 = +14), pior índice e mais artigos em risco', () => {
  const v = [
    vendor('V001', { pctAtRisk: 73.3, itemsAtRisk: 11, items: 15, risk: { ranks: { mean: 3, cv: 1, atRisk: 3 }, index: 2.33 } }),
    vendor('V002', { declaredDays: 30, datesDays: 44, risk: { ranks: { mean: 1, cv: 3, atRisk: 1 }, index: 1.67 } }),
    vendor('V003', { declaredDays: 15, datesDays: 20 }),
  ];
  const s = vendorSummary(v);
  assert.deepEqual(s.worstGap, { vendorId: 'V002', declared: 30, real: 44, gap: 14 });
  assert.equal(s.riskiest?.vendorId, 'V001');
  assert.equal(s.mostAtRisk?.vendorId, 'V001');
  const html = renderToStaticMarkup(<VendorsView data={{ ...data, vendors: v }} filters={{}} />);
  assert.match(html, /\+14/);
  assert.match(html, /V002: 30 declarados, 44 pelas datas/);
  assert.match(html, /Índice 2,33/);
  assert.match(html, /V001: 11 artigos com folga negativa/);
});
