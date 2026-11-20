import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { BeforeAfterView } from './BeforeAfterView';
import { releasedText, type BeforeAfter } from './before-after';

const data: BeforeAfter = { before: 90098726.9, after: 77153083.43, released: 12945643.47, releasedPct: 14.37, itemsAboveMax: 1 };

test('o texto "libertado" usa a formatação PT-PT', () => {
  const txt = releasedText(data).replace(/\s/g, ' ');
  assert.equal(txt, 'libertado: 12 945 643,47 € (14,37 %)');
});

test('a vista mostra o resumo, a tabela acessível antes/depois e o (i) Como é calculado', () => {
  const html = renderToStaticMarkup(<BeforeAfterView data={data} />).replace(/&nbsp;| | /g, ' ');
  assert.match(html, /Antes vs\. depois/);
  assert.match(html, /libertado: 12 945 643,47 € \(14,37 %\)/);
  assert.match(html, /<table/);
  assert.match(html, /90 098 726,90 €/);
  assert.match(html, /77 153 083,43 €/);
  assert.match(html, /Como é calculado/);
  assert.match(html, /1 artigo acima do máximo/);
});

test('estados indisponível e filtro inválido', () => {
  assert.match(renderToStaticMarkup(<BeforeAfterView data={null} />), /indisponível/);
  assert.match(renderToStaticMarkup(<BeforeAfterView data={null} error="periodo" />), /Filtro inválido: periodo/);
});
