import { createTestApp, fixture, TestApp } from './harness/test-app';

describe('drill-through (spec 8.5 e 11)', () => {
  let t: TestApp;
  afterEach(async () => t?.close());

  describe('GET /api/items/:itemRef', () => {
    it('F1: histórico e indicadores do artigo 108:xray-machine (715/392 => autonomia 1,82; folga -23,18)', async () => {
      t = await createTestApp({ csvDir: fixture('f1') });
      const res = await t.api.get('/api/items/108:xray-machine').expect(200);
      expect(res.body).toMatchObject({
        itemRef: '108:xray-machine',
        itemId: 108,
        name: 'X-ray Machine',
        stale: false,
        itemsWithoutData: 0,
      });
      expect(res.body.history).toEqual([
        {
          date: '2025-11-21', stock: 715, min: 953, max: 1475, autonomyDays: 1.82,
          leadTimeDays: 25, unitCost: 18305.37, vendorId: 'V001',
        },
      ]);
      expect(res.body.reference).toMatchObject({ date: '2025-11-21', stock: 715, autonomyDays: 1.82, slackDays: -23.18, stale: false });
      expect(['A', 'B', 'C']).toContain(res.body.abcClass);
    });

    it('o mesmo item_id com outro nome é outro artigo (108:gloves)', async () => {
      t = await createTestApp({ csvDir: fixture('f1') });
      const res = await t.api.get('/api/items/108:gloves').expect(200);
      expect(res.body.history).toHaveLength(1);
      expect(res.body.history[0]).toMatchObject({ stock: 1450, max: 767 });
    });

    it('marca desatualizado quando o snapshot de referência é > 90 dias anterior ao corte', async () => {
      t = await createTestApp({ csvDir: fixture('f1') });
      // 107 tem o último snapshot em 2025-08-05; o corte global é 2025-12-30
      const res = await t.api.get('/api/items/107:xray-machine').expect(200);
      expect(res.body.stale).toBe(true);
      expect(res.body.reference.stale).toBe(true);
    });

    it('o filtro de período limita o histórico; fora do período => sem snapshots (nunca zero)', async () => {
      t = await createTestApp({ csvDir: fixture('f1') });
      const res = await t.api.get('/api/items/108:xray-machine?periodo=2025-01-01..2025-06-30').expect(200);
      expect(res.body.history).toEqual([]);
      expect(res.body.reference).toBeNull();
      expect(res.body.itemsWithoutData).toBe(1);
    });

    it('artigo inexistente => 404 { error } claro; referência malformada => 404 também', async () => {
      t = await createTestApp({ csvDir: fixture('f1') });
      const res = await t.api.get('/api/items/999:nada').expect(404);
      expect(res.body.error).toContain('999:nada');
      await t.api.get('/api/items/lixo').expect(404);
    });
  });

  describe('GET /api/vendors/:vendorId', () => {
    it('F1: perfil de V002 (declarado 30, datas 44) e V001 com estatísticas de LT do inventário', async () => {
      t = await createTestApp({ csvDir: fixture('f1') });
      const v2 = (await t.api.get('/api/vendors/V002').expect(200)).body;
      expect(v2).toMatchObject({
        vendorId: 'V002', name: 'EquipMed Co.', itemSupplied: 'Ventilator',
        declaredLeadTimeDays: 30, datesLeadTimeDays: 44,
        leadTime: { mean: null, stdDev: null, cv: null, observations: 0 },
      });
      const v1 = (await t.api.get('/api/vendors/V001').expect(200)).body;
      expect(v1).toMatchObject({ declaredLeadTimeDays: 5, datesLeadTimeDays: 5, leadTime: { mean: 23, stdDev: 2, cv: 0.087, observations: 2 } });
    });

    it('o filtro de período aplica-se às estatísticas', async () => {
      t = await createTestApp({ csvDir: fixture('f1') });
      const v1 = (await t.api.get('/api/vendors/V001?periodo=2025-11').expect(200)).body;
      expect(v1.leadTime).toMatchObject({ mean: 25, observations: 1 });
    });

    it('fornecedor inexistente => 404 { error }', async () => {
      t = await createTestApp({ csvDir: fixture('f1') });
      const res = await t.api.get('/api/vendors/V999').expect(404);
      expect(res.body.error).toContain('V999');
    });
  });
});
