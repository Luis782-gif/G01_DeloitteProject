import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { belowMinimumStatus } from './below-minimum';
import { BelowMinimumView } from './BelowMinimumView';

test('estado: <= 5 % OK, <= 10 % atenção, > 10 % crítico (limites incluídos no estado inferior)', () => {
  assert.equal(belowMinimumStatus(0), 'ok');
  assert.equal(belowMinimumStatus(5), 'ok');
  assert.equal(belowMinimumStatus(5.1), 'atencao');
  assert.equal(belowMinimumStatus(10), 'atencao');
  assert.equal(belowMinimumStatus(10.1), 'critico');
});

const data = {
  count: 2, eligible: 4, excluded: 1, pct: 50,
  items: [
    { itemRef: '108:xray-machine', name: 'X-ray Machine', stock: 715, min: 953, referenceDate: '2025-11-21', stale: false },
    { itemRef: '104:surgical-mask', name: 'Surgical Mask', stock: 542, min: 589, referenceDate: '2025-08-01', stale: true },
  ],
};

test('cartão mostra contagem, % e estado crítico; excluídos ao lado', () => {
  const html = renderToStaticMarkup(<BelowMinimumView data={data} />);
  assert.match(html, /data-status="critico"/);
  assert.match(html, /50,0/);
  assert.match(html, /2 de 4 artigos elegíveis/);
  assert.match(html, /1 excluído/);
});

test('tabela mostra artigo, stock, mínimo, data de referência e marca de desatualizado', () => {
  const html = renderToStaticMarkup(<BelowMinimumView data={data} />);
  assert.match(html, /108:xray-machine/);
  assert.match(html, /715/);
  assert.match(html, /953/);
  assert.match(html, /2025-11-21/);
  assert.equal((html.match(/Desatualizado/g) ?? []).length, 1);
});

test('sem dados (API indisponível) ou sem artigos: mensagem, nunca erro', () => {
  assert.match(renderToStaticMarkup(<BelowMinimumView data={null} />), /indisponível/);
  const empty = renderToStaticMarkup(<BelowMinimumView data={{ count: 0, eligible: 0, excluded: 0, pct: 0, items: [] }} />);
  assert.match(empty, /data-status="ok"/);
  assert.match(empty, /Nenhum artigo abaixo do mínimo/);
});
