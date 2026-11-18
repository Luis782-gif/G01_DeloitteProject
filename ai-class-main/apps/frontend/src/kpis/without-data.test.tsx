import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { BelowMinimumView } from './BelowMinimumView';

const data = { count: 2, eligible: 4, excluded: 1, pct: 50, itemsWithoutData: 0, items: [] };

test('"N artigos sem dados no período" aparece só quando > 0 e não altera o cartão', () => {
  assert.doesNotMatch(renderToStaticMarkup(<BelowMinimumView data={data} />), /sem dados no período/);
  const html = renderToStaticMarkup(<BelowMinimumView data={{ ...data, itemsWithoutData: 3 }} />);
  assert.match(html, /3 artigos sem dados no período/);
  assert.match(html, /50,0/);
  assert.match(renderToStaticMarkup(<BelowMinimumView data={{ ...data, itemsWithoutData: 1 }} />), /1 artigo sem dados no período/);
});

test('filtro inválido (400 da API): mostra a mensagem em vez de "indisponível"', () => {
  const html = renderToStaticMarkup(<BelowMinimumView data={null} error="Período inválido" />);
  assert.match(html, /Filtro inválido: Período inválido/);
});
