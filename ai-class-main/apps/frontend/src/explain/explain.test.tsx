import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExplainView, type ExplainEntry } from './ExplainPanel';

const entry: ExplainEntry = {
  id: 'autonomy',
  title: 'Autonomia',
  formula: 'stock / consumo diário',
  source: 'slide 111',
  columns: ['current_stock', 'avg_usage_per_day'],
  unit: 'dias',
  approximation: 'consumo constante',
  limitations: ['consumo 0: indefinida'],
};

test('painel mostra fórmula, fonte, colunas, unidade, aproximação e limitações', () => {
  const html = renderToStaticMarkup(<ExplainView entry={entry} />);
  for (const t of ['Como é calculado: Autonomia', 'stock / consumo diário', 'slide 111', 'current_stock, avg_usage_per_day', 'dias', 'consumo constante', 'consumo 0: indefinida']) {
    assert.ok(html.includes(t), t);
  }
});

test('painel mostra erro e estado de carregamento', () => {
  assert.match(renderToStaticMarkup(<ExplainView entry={null} error="KPI desconhecido: x" />), /role="alert"[^>]*>KPI desconhecido: x/);
  assert.match(renderToStaticMarkup(<ExplainView entry={null} />), /A carregar/);
});
