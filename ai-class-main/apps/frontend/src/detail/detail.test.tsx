import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { closeDetailHref, detailApiPath, detailHref, parseDetail } from './detail';
import { DetailView, type ItemDetail, type VendorDetail } from './DetailPanel';

test('detailHref acrescenta ?detalhe= preservando os filtros e outros parâmetros', () => {
  assert.equal(detailHref('', 'artigo', '108:xray-machine'), '?detalhe=artigo:108:xray-machine');
  assert.equal(detailHref('periodo=2025-Q3&tipo=Equipment', 'fornecedor', 'V002'), '?periodo=2025-Q3&tipo=Equipment&detalhe=fornecedor:V002');
  assert.equal(detailHref(new URLSearchParams('classe=A&detalhe=artigo:1:x'), 'fornecedor', 'V001'), '?classe=A&detalhe=fornecedor:V001');
});

test('closeDetailHref remove só o detalhe (os filtros globais ficam)', () => {
  assert.equal(closeDetailHref('periodo=2025&detalhe=artigo:108:xray-machine&tipo=Equipment', '/onde-doi'), '/onde-doi?periodo=2025&tipo=Equipment');
  assert.equal(closeDetailHref('detalhe=fornecedor:V002', '/'), '/');
});

test('parseDetail lê artigo e fornecedor; ignora valores inválidos', () => {
  assert.deepEqual(parseDetail('artigo:108:xray-machine'), { kind: 'artigo', ref: '108:xray-machine' });
  assert.deepEqual(parseDetail('fornecedor:V002'), { kind: 'fornecedor', ref: 'V002' });
  assert.equal(parseDetail('artigo:'), null);
  assert.equal(parseDetail('outra:coisa'), null);
  assert.equal(parseDetail(null), null);
});

test('detailApiPath usa /api/items|vendors e propaga filtros (sem artigo/fornecedor próprios)', () => {
  assert.equal(detailApiPath({ kind: 'artigo', ref: '108:xray-machine' }, new URLSearchParams('periodo=2025&detalhe=x&artigo=1:a')), '/api/items/108%3Axray-machine?periodo=2025');
  assert.equal(detailApiPath({ kind: 'fornecedor', ref: 'V002' }, new URLSearchParams('fornecedor=V001&tipo=Equipment')), '/api/vendors/V002?tipo=Equipment');
});

const item: ItemDetail = {
  itemRef: '108:xray-machine', itemId: 108, name: 'X-ray Machine', abcClass: 'A', stale: true, itemsWithoutData: 0,
  reference: { date: '2025-11-21', stock: 715, min: 953, max: 1475, autonomyDays: 1.82, slackDays: -23.18, leadTimeDays: 25, unitCost: 18305.37, vendorId: 'V001', stale: true },
  history: [{ date: '2025-11-21', stock: 715, min: 953, max: 1475, autonomyDays: 1.82, leadTimeDays: 25, unitCost: 18305.37, vendorId: 'V001' }],
};

test('painel do artigo: diálogo com histórico, classe, folga e marca de desatualizado', () => {
  const html = renderToStaticMarkup(<DetailView detail={{ kind: 'artigo', data: item }} onClose={() => {}} />);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-label="Fechar"/);
  for (const t of ['X-ray Machine', 'Classe ABC', 'Desatualizado', '2025-11-21', '715', '953', '1475']) assert.ok(html.includes(t), t);
});

test('painel do fornecedor: prazo declarado vs. prazo pelas datas e estatísticas de LT', () => {
  const v: VendorDetail = {
    vendorId: 'V002', name: 'EquipMed Co.', itemSupplied: 'Ventilator', declaredLeadTimeDays: 30, datesLeadTimeDays: 44,
    lastOrderDate: '2024-09-01', nextDeliveryDate: '2024-10-15', leadTime: { mean: null, stdDev: null, cv: null, observations: 0 },
  };
  const html = renderToStaticMarkup(<DetailView detail={{ kind: 'fornecedor', data: v }} onClose={() => {}} />);
  for (const t of ['EquipMed Co.', 'Ventilator', '30', '44', 'Sem snapshots']) assert.ok(html.includes(t), t);
});

test('erro e carregamento', () => {
  assert.match(renderToStaticMarkup(<DetailView error='Artigo desconhecido: "9:x"' onClose={() => {}} />), /role="alert"[^>]*>Artigo desconhecido/);
  assert.match(renderToStaticMarkup(<DetailView onClose={() => {}} />), /A carregar/);
});
