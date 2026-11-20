import { createTestApp, fixture, TestApp } from './harness/test-app';

describe('filtros globais (periodo, artigo, tipo, fornecedor)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ csvDir: fixture('periods') });
  });
  afterAll(async () => {
    await t?.close();
  });

  const bm = async (qs: string) => (await t.api.get(`/api/kpis/below-minimum${qs}`).expect(200)).body;
  const refs = (b: any) => b.items.map((i: any) => i.itemRef);

  it('sem filtro: intervalo completo, nenhum artigo sem dados', async () => {
    const b = await bm('');
    expect(b).toMatchObject({ count: 4, eligible: 4, excluded: 0, itemsWithoutData: 0 });
  });

  it('periodo=2025-Q1 corta o histórico: referência é o último snapshot até 2025-03-31', async () => {
    const b = await bm('?periodo=2025-Q1');
    expect(b).toMatchObject({ count: 2, eligible: 2, itemsWithoutData: 2 });
    expect(b.items.map((i: any) => [i.itemRef, i.referenceDate])).toEqual([
      ['1:alpha', '2025-01-15'],
      ['2:beta-item', '2025-02-10'],
    ]);
  });

  it('o corte de período muda o resultado do mesmo artigo (Alpha ok em Q2, abaixo em Q3)', async () => {
    const q2 = await bm('?periodo=2025-Q2');
    expect(q2).toMatchObject({ count: 0, eligible: 1, itemsWithoutData: 3 });
    const q3 = await bm('?periodo=2025-Q3');
    expect(q3).toMatchObject({ count: 2, eligible: 3, itemsWithoutData: 1 });
    expect(refs(q3)).toEqual(['4:delta', '1:alpha']);
  });

  it('artigo sem snapshots no período não conta como zero nem como elegível', async () => {
    const b = await bm('?periodo=2025-Q1&artigo=3:gamma');
    expect(b).toMatchObject({ count: 0, eligible: 0, pct: 0, itemsWithoutData: 1, items: [] });
  });

  it('formas do período: ano, mês e intervalo de datas', async () => {
    expect(await bm('?periodo=2025')).toMatchObject({ count: 4, itemsWithoutData: 0 });
    expect(await bm('?periodo=2025-02')).toMatchObject({ count: 1, eligible: 1, itemsWithoutData: 3 });
    expect(await bm('?periodo=2025-01-01..2025-03-31')).toMatchObject({ count: 2, eligible: 2, itemsWithoutData: 2 });
    expect(await bm('?periodo=2024')).toMatchObject({ count: 0, eligible: 0, itemsWithoutData: 4 });
  });

  it('o fim do período é a data de corte: desatualizado mede-se até ela', async () => {
    const b = await bm('?periodo=2025-01-01..2025-06-30'); // Beta: 2025-02-10 a 2025-06-30 = 140 dias
    expect(b.items.find((i: any) => i.itemRef === '2:beta-item').stale).toBe(true);
    expect(b.items.find((i: any) => i.itemRef === '1:alpha')).toBeUndefined(); // Alpha ok em 04-10
  });

  it('tipo usa o tipo do snapshot; sem dados conta só artigos sem snapshot no período', async () => {
    expect(await bm('?tipo=Equipment')).toMatchObject({ count: 2, eligible: 2, itemsWithoutData: 0 });
    expect(await bm('?tipo=Consumable')).toMatchObject({ count: 2, eligible: 2 });
    const b = await bm('?tipo=Equipment&periodo=2025-Q1');
    expect(b).toMatchObject({ count: 1, eligible: 1, itemsWithoutData: 2 });
  });

  it('fornecedor filtra por vendor_id e combina com o período', async () => {
    expect(await bm('?fornecedor=V002')).toMatchObject({ count: 2, eligible: 2 });
    expect(refs(await bm('?fornecedor=V002&periodo=2025-Q3'))).toEqual([]);
  });

  it('valores inválidos devolvem 400 com { error, field }', async () => {
    for (const [qs, field] of [
      ['periodo=2025-Q5', 'periodo'],
      ['periodo=2025-13', 'periodo'],
      ['periodo=2025-03-31..2025-01-01', 'periodo'],
      ['periodo=ontem', 'periodo'],
      ['artigo=999:nada', 'artigo'],
      ['artigo=abc', 'artigo'],
      ['tipo=Banana', 'tipo'],
      ['fornecedor=V999', 'fornecedor'],
    ]) {
      const res = await t.api.get(`/api/kpis/below-minimum?${qs}`).expect(400);
      expect(res.body).toMatchObject({ field });
      expect(typeof res.body.error).toBe('string');
    }
  });

  it('GET /api/filters/options: artigos, tipos, fornecedores e intervalo de datas', async () => {
    const res = await t.api.get('/api/filters/options').expect(200);
    expect(res.body.items).toEqual([
      { itemRef: '1:alpha', name: 'Alpha' },
      { itemRef: '2:beta-item', name: 'Beta Item' },
      { itemRef: '3:gamma', name: 'Gamma' },
      { itemRef: '4:delta', name: 'Delta' },
    ]);
    expect(res.body.types).toEqual(['Consumable', 'Equipment']);
    expect(res.body.vendors.map((v: any) => v.vendorId)).toEqual(['V001', 'V002', 'V003']);
    expect(res.body.dateRange).toEqual({ min: '2025-01-15', max: '2025-11-01' });
  });

  it('opções sem dados carregados: listas vazias e intervalo nulo', async () => {
    const e = await createTestApp();
    try {
      const res = await e.api.get('/api/filters/options').expect(200);
      expect(res.body).toEqual({ items: [], types: [], vendors: [], dateRange: { min: null, max: null } });
    } finally {
      await e.close();
    }
  });
});
