import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReorderView } from './ReorderView';
import { exportHref, type ReorderSuggestions } from './reorder';

const data: ReorderSuggestions = {
  items: [
    { itemRef: '1:a', name: 'A', level: 5, class: 'A', stock: 100, reorderPoint: 161, safetyStock: 17, suggest: 400, reason: 'stock 100 abaixo da rutura esperada no tempo de reposição (144)', lowConfidence: true },
  ],
  totals: { items: 1, units: 400 },
  withoutConsumption: 2,
};

test('a vista mostra a linha, os totais, a ressalva e o botão de exportação com os filtros', () => {
  const href = exportHref({ tipo: 'Equipment' });
  assert.match(href, /\/api\/reorder-suggestions\/export[.]csv\?.*tipo=Equipment/);
  const html = renderToStaticMarkup(<ReorderView data={data} exportHref={href} />);
  assert.match(html, /1:a/);
  assert.match(html, /Nível de triagem 5 de 5/);
  assert.match(html, /400/);
  assert.match(html, /sem quantidade económica de encomenda/);
  assert.match(html, /Exportar lista de compras/);
  assert.match(html, /export[.]csv/);
  assert.match(html, /confiança baixa/);
  assert.match(html, /2 artigo\(s\) sem consumo/);
});

test('estados vazio, indisponível e filtro inválido', () => {
  const empty = { items: [], totals: { items: 0, units: 0 }, withoutConsumption: 0 };
  assert.match(renderToStaticMarkup(<ReorderView data={empty} exportHref="x" />), /Nenhum artigo abaixo/);
  assert.match(renderToStaticMarkup(<ReorderView data={null} exportHref="x" />), /indisponível/);
  assert.match(renderToStaticMarkup(<ReorderView data={null} error="Tipo desconhecido" exportHref="x" />), /Filtro inválido/);
});
