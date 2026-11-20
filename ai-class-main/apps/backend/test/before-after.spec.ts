import { createTestApp, fixture, TestApp } from './harness/test-app';

describe('GET /api/impact/before-after (spec 8.4)', () => {
  let t: TestApp;
  afterEach(async () => t?.close());

  it('F1: antes 90 098 726,90; libertado 12 945 643,47 (artigo 108 Gloves: (1450 − 767) × 18 954,09); depois 77 153 083,43; 14,37 %', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/impact/before-after').expect(200);
    expect(res.body).toEqual({ before: 90098726.9, after: 77153083.43, released: 12945643.47, releasedPct: 14.37, itemsAboveMax: 1 });
  });

  it('sem artigos acima do máximo (tipo Equipment): libertado 0 e depois = antes (62 615 296,40)', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/impact/before-after?tipo=Equipment').expect(200);
    expect(res.body).toEqual({ before: 62615296.4, after: 62615296.4, released: 0, releasedPct: 0, itemsAboveMax: 0 });
  });

  it('o filtro por tipo aplica-se (Consumable: antes 1450 × 18 954,09 = 27 483 430,50)', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/impact/before-after?tipo=Consumable').expect(200);
    expect(res.body).toEqual({ before: 27483430.5, after: 14537787.03, released: 12945643.47, releasedPct: 47.1, itemsAboveMax: 1 });
    await t.api.get('/api/impact/before-after?periodo=lixo').expect(400);
  });

  it('sem dados: zeros, sem erro nem divisão por zero', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/impact/before-after').expect(200);
    expect(res.body).toEqual({ before: 0, after: 0, released: 0, releasedPct: 0, itemsAboveMax: 0 });
  });

  it('"Como é calculado" before-after: regra explícita, custos irrealistas e não é previsão', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/kpis/before-after/explain').expect(200);
    const text = JSON.stringify(res.body);
    expect(text).toMatch(/suspensas/);
    expect(text).toMatch(/irrealistas/);
    expect(text).toMatch(/não é uma previsão/);
  });
});
