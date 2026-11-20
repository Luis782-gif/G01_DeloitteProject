import { createTestApp, fixture, TestApp } from './harness/test-app';

describe('GET /api/kpis/trend', () => {
  let t: TestApp;
  afterEach(async () => t?.close());

  it('below_min_pct: % de registos abaixo do mínimo por mês; mês sem snapshots é lacuna (nulo); R11 fora', async () => {
    t = await createTestApp({ csvDir: fixture('trend') });
    const res = await t.api.get('/api/kpis/trend?metric=below_min_pct').expect(200);
    expect(res.body).toEqual([
      { month: '2025-01', value: 50, previousValue: null, delta: null, snapshots: 2 },
      { month: '2025-02', value: 0, previousValue: 50, delta: -50, snapshots: 1 },
      { month: '2025-03', value: null, previousValue: 0, delta: null, snapshots: 0 },
      { month: '2025-04', value: 100, previousValue: null, delta: null, snapshots: 1 },
      { month: '2025-05', value: 0, previousValue: 100, delta: -100, snapshots: 1 },
    ]);
  });

  it('lead_time: média por mês, LT <= 0 fora (mês só com LT inválido = lacuna)', async () => {
    t = await createTestApp({ csvDir: fixture('trend') });
    const res = await t.api.get('/api/kpis/trend?metric=lead_time').expect(200);
    expect(res.body).toEqual([
      { month: '2025-01', value: 15, previousValue: null, delta: null, snapshots: 2 },
      { month: '2025-02', value: 10, previousValue: 15, delta: -5, snapshots: 1 },
      { month: '2025-03', value: null, previousValue: 10, delta: null, snapshots: 0 },
      { month: '2025-04', value: 10, previousValue: null, delta: null, snapshots: 2 },
      { month: '2025-05', value: null, previousValue: 10, delta: null, snapshots: 0 },
    ]);
  });

  it('os filtros globais aplicam-se (fornecedor V002; período)', async () => {
    t = await createTestApp({ csvDir: fixture('trend') });
    const v = await t.api.get('/api/kpis/trend?metric=lead_time&fornecedor=V002').expect(200);
    expect(v.body.find((m: any) => m.month === '2025-01')).toMatchObject({ value: 20, snapshots: 1 });
    expect(v.body.find((m: any) => m.month === '2025-02')).toMatchObject({ value: null, snapshots: 0 });
    const r = await t.api.get('/api/kpis/trend?metric=lead_time&periodo=2025-Q1').expect(200);
    expect(r.body.map((m: any) => m.month)).toEqual(['2025-01', '2025-02', '2025-03']);
  });

  it('métrica desconhecida: 400; sem dados: lista vazia', async () => {
    t = await createTestApp();
    await t.api.get('/api/kpis/trend?metric=foo').expect(400);
    const res = await t.api.get('/api/kpis/trend?metric=lead_time').expect(200);
    expect(res.body).toEqual([]);
  });
});
