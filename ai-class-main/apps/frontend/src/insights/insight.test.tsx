import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { InsightView } from './InsightView';

test('mostra a frase vinda da API', () => {
  const html = renderToStaticMarkup(<InsightView sentences={[{ text: '29 de 50 artigos têm dias de folga negativos.', values: {} }]} />);
  assert.match(html, /29 de 50 artigos/);
});

test('sem frases ou API indisponível: nada', () => {
  assert.equal(renderToStaticMarkup(<InsightView sentences={[]} />), '');
  assert.equal(renderToStaticMarkup(<InsightView sentences={null} />), '');
});
