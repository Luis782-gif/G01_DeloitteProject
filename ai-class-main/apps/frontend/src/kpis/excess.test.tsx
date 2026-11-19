import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { barRows, type ExcessCapital, type IdleStock } from './excess';
import { ExcessCardsView } from './ExcessCardsView';
import { ExcessBarsView } from './ExcessBarsView';

const excess: ExcessCapital = {
  valueEur: 12945643.47, totalValueEur: 90098726.9, pct: 14.37, status: 'critico',
  thresholds: { okPct: 5, atencaoPct: 10 }, itemsAbove: 2, itemsWithoutData: 1,
  byType: [
    { type: 'Consumable', valueEur: 100, items: [{ itemRef: '108:gloves', name: 'Gloves', excessUnits: 5, valueEur: 60 }, { itemRef: '1:a', name: 'A', excessUnits: 1, valueEur: 40 }] },
    { type: 'Equipment', valueEur: 50, items: [{ itemRef: '2:b', name: 'B', excessUnits: 1, valueEur: 50 }] },
  ],
};
const idle: IdleStock = { days: 60, valueEur: 0, itemsOver: 0, itemsWithoutData: 0, items: [] };

test('barRows: só tipos por defeito; o tipo expandido mostra os seus artigos logo a seguir', () => {
  assert.deepEqual(barRows(excess.byType, null).map((r) => r.key), ['t:Consumable', 't:Equipment']);
  assert.deepEqual(barRows(excess.byType, 'Consumable').map((r) => r.key), ['t:Consumable', 'a:108:gloves', 'a:1:a', 't:Equipment']);
});

test('cartões: capital em excesso com estado e %, stock parado informativo com X', () => {
  const html = renderToStaticMarkup(<ExcessCardsView excess={excess} idle={idle} />);
  assert.match(html, /Capital em excesso/);
  assert.match(html, /data-status="critico"/);
  assert.match(html, /14,4/);
  assert.match(html, /Stock parado/);
  assert.match(html, /60 dias/);
  assert.match(html, /1 artigo sem dados no período/);
});

test('cartões: API indisponível e filtro inválido não rebentam', () => {
  assert.match(renderToStaticMarkup(<ExcessCardsView excess={null} idle={null} />), /indisponível/);
  assert.match(renderToStaticMarkup(<ExcessCardsView excess={null} idle={null} error="Período inválido" />), /Filtro inválido: Período inválido/);
});

test('barras: botões por tipo (drill-down), expandido marcado com aria-expanded', () => {
  const html = renderToStaticMarkup(<ExcessBarsView data={excess} initialExpanded="Consumable" />);
  assert.match(html, /aria-expanded="true"[^>]*>[^<]*Consumable/);
  assert.match(html, /aria-expanded="false"[^>]*>[^<]*Equipment/);
  assert.match(html, /108:gloves/);
});

test('barras: sem excesso, mensagem', () => {
  const html = renderToStaticMarkup(<ExcessBarsView data={{ ...excess, byType: [], itemsAbove: 0 }} />);
  assert.match(html, /Nenhum artigo acima do máximo/);
});
