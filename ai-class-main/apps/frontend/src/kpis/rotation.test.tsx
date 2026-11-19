import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { RotationView } from './RotationView';

const value = { secondary: true as const, rotation: 0.9, annualizedRotation: 3.7 };
const data = {
  periodDays: 90, itemsWithoutData: 2, estimatedConsumption: 18090, averageStock: 1267.33,
  rotation: 14.274, annualizedRotation: 57.894, value,
  items: [
    { itemRef: '100:ventilator', name: 'Ventilator', snapshots: 3, estimatedConsumption: 18090, averageStock: 1267.33,
      rotation: 14.274, annualizedRotation: 57.894, value },
    { itemRef: '101:x', name: 'X', snapshots: 1, estimatedConsumption: 10, averageStock: 0, rotation: null, annualizedRotation: null, value: { ...value, rotation: null, annualizedRotation: null } },
  ],
};

test('cartão sem estado mostra rotação em unidades, anualizada e versão em valor secundária', () => {
  const html = renderToStaticMarkup(<RotationView data={data} />);
  assert.match(html, /14,27/);
  assert.doesNotMatch(html, /data-status/);
  assert.match(html, /57,89/);
  assert.match(html, /secundária/);
  assert.match(html, /2 artigos sem dados no período/);
  assert.match(html, /100:ventilator/);
});

test('API indisponível ou filtro inválido: mensagem, nunca erro', () => {
  assert.match(renderToStaticMarkup(<RotationView data={null} />), /indisponível/);
  assert.match(renderToStaticMarkup(<RotationView data={null} error="periodo" />), /Filtro inválido/);
});
