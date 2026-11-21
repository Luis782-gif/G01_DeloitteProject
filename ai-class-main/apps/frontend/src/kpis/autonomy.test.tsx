import { test } from 'node:test';
import assert from 'node:assert/strict';
import { belowDiagonal, scatterSeries, type AutonomyItem } from './autonomy';

const item = (o: Partial<AutonomyItem>): AutonomyItem => ({
  itemRef: '1:a', name: 'A', autonomy: 10, leadTime: 5, slack: 5, status: 'atencao', noConsumption: false, referenceDate: '2025-06-01', stale: false, ...o,
});
const items = [
  item({}),
  item({ itemRef: '2:b', autonomy: 3, slack: -2, status: 'critico' }),
  item({ itemRef: '3:c', autonomy: null, slack: null, status: null, noConsumption: true }),
];

test('dispersão: separa por estado, deixa de fora "sem consumo" e conta abaixo da diagonal', () => {
  const s = scatterSeries(items);
  assert.equal(s.points.atencao.length, 1);
  assert.deepEqual(s.points.critico.map((p) => [p.x, p.y]), [[5, 3]]);
  assert.equal(s.noConsumption, 1);
  assert.equal(s.max, 10);
  assert.equal(belowDiagonal(items), 1);
});
