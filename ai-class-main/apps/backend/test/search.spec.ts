import { createTestApp, fixture, TestApp } from './harness/test-app';

describe('GET /api/search (spec 10 e 11)', () => {
  let t: TestApp;
  afterEach(async () => t?.close());
  const search = async (q: string) =>
    (await t.api.get('/api/search').query({ q }).expect(200)).body.results as Array<{ kind: string; ref: string; label: string; detail: string }>;

  it('"xray" encontra todos os artigos X-ray Machine (por nome), com ref de drill-through', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const r = await search('xray');
    expect(r.filter((x) => x.kind === 'artigo').map((x) => x.ref).sort()).toEqual(['107:xray-machine', '108:xray-machine']);
    expect(r[0]).toMatchObject({ kind: 'artigo', label: 'X-ray Machine' });
    expect(typeof r[0].detail).toBe('string');
  });

  it('sem diferenciar maiúsculas, acentos ou hífen/espaço: "x-ray", "X RAY", "XRAY"', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    for (const q of ['x-ray', 'X RAY', 'XRAY']) expect((await search(q)).filter((x) => x.kind === 'artigo')).toHaveLength(2);
  });

  it('por código do artigo: "108" => 108:gloves e 108:xray-machine', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    expect((await search('108')).map((x) => x.ref).sort()).toEqual(['108:gloves', '108:xray-machine']);
  });

  it('por fornecedor: nome ("equipmed", "EQUIPMED co") e id ("v002")', async () => {
    t = await createTestApp({ csvDir: fixture('vendors3') });
    for (const q of ['equipmed', 'EQUIPMED co', 'v002']) {
      expect(await search(q)).toContainEqual(expect.objectContaining({ kind: 'fornecedor', ref: 'V002', label: 'EquipMed Co.' }));
    }
  });

  it('q vazio, ausente ou com menos de 2 caracteres => lista vazia (200)', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    expect(await search('')).toEqual([]);
    expect(await search('x')).toEqual([]);
    expect(await search('  ')).toEqual([]);
    expect((await t.api.get('/api/search').expect(200)).body).toEqual({ results: [] });
  });

  it('q demasiado longo, com caracteres de controlo, aspas ou % é tratado em segurança', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    expect(await search('a'.repeat(5000))).toEqual([]);
    expect(await search('xray\u0001\u0007')).toEqual([]);
    expect(await search("'; DROP TABLE dim_item; --")).toEqual([]);
    expect(await search('%%')).toEqual([]);
    expect((await search('xray')).length).toBeGreaterThan(0);
  });

  it('prefixo antes de contém (fornecedores: MedSupplies antes de EquipMed para "med")', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const vendors = (await search('med')).filter((x) => x.kind === 'fornecedor').map((x) => x.label);
    expect(vendors).toEqual(['MedSupplies Inc.', 'EquipMed Co.']);
  });

  it('limita a 10 resultados por tipo', async () => {
    t = await createTestApp({ csvDir: fixture('many') });
    const r = await search('widget');
    expect(r.filter((x) => x.kind === 'artigo')).toHaveLength(10);
  });
});
