import { createTestApp, fixture, TestApp } from './harness/test-app';

const refs = (b: any[], cls: string) => b.filter((r) => r.class === cls).map((r) => r.itemRef);
const nums = (b: any[], cls: string) => refs(b, cls).map((r: string) => r.slice(0, 1));

describe('GET /api/abc/pareto', () => {
  let t: TestApp | undefined;
  afterEach(async () => {
    await t?.close();
    t = undefined;
  });

  it('F1 (spec 12.1), cortes 80/95: A={310,457}, B={418}, C={419,346}; total 90 098 726,90', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const { body } = await t.api.get('/api/abc/pareto').expect(200);
    expect(body.map((r: any) => [r.itemRef, r.value, r.cumPct, r.refCumPct, r.class])).toEqual([
      ['107:x-ray-machine', 44574469.1, 49.47, 20, 'A'],
      ['108:gloves', 27483430.5, 79.98, 40, 'A'],
      ['108:x-ray-machine', 13088339.55, 94.5, 60, 'B'],
      ['104:surgical-mask', 4549369.14, 99.55, 80, 'C'],
      ['100:gloves', 403118.61, 100, 100, 'C'],
    ]);
    const total = body.reduce((s: number, r: any) => s + r.value, 0);
    expect(total).toBeCloseTo(90098726.9, 2);
  });

  it('exemplo da aula (slides 22-24) com cortes 66/91 como parâmetros', async () => {
    t = await createTestApp({ csvDir: fixture('abc-aula') });
    const { body } = await t.api.get('/api/abc/pareto?cutA=66&cutB=91').expect(200);
    expect(nums(body, 'A')).toEqual(['2', '5']);
    expect(nums(body, 'B')).toEqual(['8', '3']);
    expect(nums(body, 'C')).toEqual(['1', '4', '7', '6']);
    expect(body.map((r: any) => r.cumPct)).toEqual([33.33, 65, 78.33, 90.83, 95, 97.5, 99.17, 100]);
  });

  it('com 80/95 o mesmo exemplo dá A={2,5,8}, B={3,1}, C={4,7,6} (decisão da equipa)', async () => {
    t = await createTestApp({ csvDir: fixture('abc-aula') });
    const { body } = await t.api.get('/api/abc/pareto').expect(200);
    expect([nums(body, 'A'), nums(body, 'B'), nums(body, 'C')]).toEqual([['2', '5', '8'], ['3', '1'], ['4', '7', '6']]);
  });

  it('o primeiro artigo é sempre A, mesmo que sozinho passe o corte', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const { body } = await t.api.get('/api/abc/pareto?cutA=10&cutB=20').expect(200);
    expect(body.map((r: any) => r.class)).toEqual(['A', 'C', 'C', 'C', 'C']);
  });

  it('cortes inválidos -> 400 com o campo', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    for (const qs of ['cutA=abc', 'cutA=90&cutB=80', 'cutB=101', 'cutA=0']) {
      const r = await t.api.get(`/api/abc/pareto?${qs}`).expect(400);
      expect(r.body.field).toMatch(/^cut[AB]$/);
    }
  });

  it('AC-13: filtrar por tipo, fornecedor ou artigo não muda a classe de um artigo', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const pairs = (b: any[]) => b.map((r) => [r.itemRef, r.class]);
    const byTipo = (await t.api.get('/api/abc/pareto?tipo=Equipment').expect(200)).body;
    expect(pairs(byTipo)).toEqual([
      ['107:x-ray-machine', 'A'],
      ['108:x-ray-machine', 'B'],
      ['104:surgical-mask', 'C'],
      ['100:gloves', 'C'],
    ]);
    const byVendor = (await t.api.get('/api/abc/pareto?fornecedor=V003').expect(200)).body;
    expect(pairs(byVendor)).toEqual([
      ['108:gloves', 'A'],
      ['104:surgical-mask', 'C'],
      ['100:gloves', 'C'],
    ]);
    const byItem = (await t.api.get('/api/abc/pareto?artigo=108:x-ray-machine').expect(200)).body;
    expect(pairs(byItem)).toEqual([['108:x-ray-machine', 'B']]);
  });

  it('filtro classe: usa a classe depois dos outros filtros, no Pareto e nos KPI', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const a = (await t.api.get('/api/abc/pareto?classe=A').expect(200)).body;
    expect(a.map((r: any) => r.itemRef)).toEqual(['107:x-ray-machine', '108:gloves']);
    const c = (await t.api.get('/api/abc/pareto?classe=C&tipo=Equipment').expect(200)).body;
    expect(c.map((r: any) => r.itemRef)).toEqual(['104:surgical-mask', '100:gloves']);
    const bm = (await t.api.get('/api/kpis/below-minimum?classe=B').expect(200)).body;
    expect(bm.items.map((i: any) => i.itemRef)).toEqual(['108:x-ray-machine']);
    await t.api.get('/api/abc/pareto?classe=D').expect(400);
  });

  it('o período entra antes da classe: classe calculada sobre os artigos do período', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const { body } = await t.api.get('/api/abc/pareto?periodo=2025-08-01..2025-11-21').expect(200);
    // 107 = 44,57M, 108 X-ray = 13,09M, 100 = 0,40M; total 58,07M -> 76,8 % / 99,3 % / 100 %
    expect(body.map((r: any) => [r.itemRef, r.class])).toEqual([
      ['107:x-ray-machine', 'A'],
      ['108:x-ray-machine', 'C'],
      ['100:gloves', 'C'],
    ]);
  });

  it('sem dados: lista vazia', async () => {
    t = await createTestApp();
    expect((await t.api.get('/api/abc/pareto').expect(200)).body).toEqual([]);
  });
});
