import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, fixture, TestApp } from './harness/test-app';

const HEADER = 'Date,Item_ID,Item_Type,Item_Name,Current_Stock,Min_Required,Max_Capacity,Unit_Cost,Avg_Usage_Per_Day,Restock_Lead_Time,Vendor_ID';
const VENDORS =
  'Vendor_ID,Vendor_Name,Item_Supplied,Avg_Lead_Time (days),Cost_Per_Item,Last_Order_Date,Next_Delivery_Date\n' +
  'V1,Acme,Stuff,5,1.00,2025-01-01,2025-01-10\n';

// Calculado à mão: data de referência + autonomia (stock / consumo), truncada ao dia.
const F1: Record<string, { ref: string; autonomy: number; depletion: string }> = {
  '108:xray-machine': { ref: '2025-11-21', autonomy: 1.824, depletion: '2025-11-22' }, // 715/392
  '104:surgical-mask': { ref: '2025-11-22', autonomy: 1.319, depletion: '2025-11-23' }, // 542/411
  '108:gloves': { ref: '2025-12-30', autonomy: 9.731, depletion: '2026-01-08' }, // 1450/149
  '107:xray-machine': { ref: '2025-08-05', autonomy: 5.605, depletion: '2025-08-10' }, // 2270/405
  '100:gloves': { ref: '2025-09-10', autonomy: 2.644, depletion: '2025-09-12' }, // 1293/489
};

describe('GET /api/shortage-calendar', () => {
  let t: TestApp;
  let tmp: string | undefined;
  afterEach(async () => {
    await t?.close();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  it('F1: data de esgotamento = referência + autonomia truncada ao dia, ordenada por data', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/shortage-calendar').expect(200);
    expect(res.body.items).toHaveLength(5);
    expect(res.body.noConsumption).toEqual([]);
    for (const i of res.body.items) {
      const e = F1[i.itemRef];
      expect(i.referenceDate).toBe(e.ref);
      expect(i.autonomyDays).toBeCloseTo(e.autonomy, 2);
      expect(i.depletionDate).toBe(e.depletion);
    }
    const dates = res.body.items.map((i: { depletionDate: string }) => i.depletionDate);
    expect(dates).toEqual(['2025-08-10', '2025-09-12', '2025-11-22', '2025-11-23', '2026-01-08']);
  });

  it('F1: data de corte 2025-12-30; esgotamento anterior ao corte = "já esgotado"; snapshot > 90 dias = desatualizado', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/shortage-calendar').expect(200);
    expect(res.body.cutoffDate).toBe('2025-12-30');
    const by = Object.fromEntries(res.body.items.map((i: { itemRef: string }) => [i.itemRef, i]));
    expect(by['107:xray-machine']).toMatchObject({ stale: true, alreadyDepleted: true });
    expect(by['100:gloves']).toMatchObject({ stale: true, alreadyDepleted: true });
    expect(by['108:gloves']).toMatchObject({ stale: false, alreadyDepleted: false });
    expect(by['108:xray-machine']).toMatchObject({ stale: false, alreadyDepleted: true });
  });

  it('artigo sem consumo: lista à parte, sem data, sem erro', async () => {
    tmp = mkdtempSync(join(tmpdir(), 'cal-'));
    const rows = [
      '2025-06-01,1,Equipment,Alpha,100,10,500,1.00,10,5,V1',
      '2025-06-01,2,Equipment,Beta,50,10,500,1.00,0,5,V1',
    ];
    writeFileSync(join(tmp, 'inventory_data.csv'), [HEADER, ...rows].join('\n') + '\n');
    writeFileSync(join(tmp, 'vendor_data.csv'), VENDORS);
    for (const f of ['financial_data.csv', 'patient_data.csv', 'staff_data.csv']) {
      writeFileSync(join(tmp, f), readFileSync(join(fixture('f1'), f), 'utf8'));
    }
    t = await createTestApp({ csvDir: tmp });
    const res = await t.api.get('/api/shortage-calendar').expect(200);
    expect(res.body.items.map((i: { itemRef: string; depletionDate: string }) => [i.itemRef, i.depletionDate])).toEqual([['1:alpha', '2025-06-11']]);
    expect(res.body.noConsumption).toEqual([{ itemRef: '2:beta', name: 'Beta', referenceDate: '2025-06-01', stale: false }]);
  });

  it('filtros globais aplicam-se (tipo) e sem dados devolve listas vazias', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/shortage-calendar?tipo=Consumable').expect(200);
    expect(res.body.items.map((i: { itemRef: string }) => i.itemRef)).toEqual(['108:gloves']);
    await t.api.get('/api/shortage-calendar?periodo=lixo').expect(400);
    await t.close();
    t = await createTestApp();
    const empty = await t.api.get('/api/shortage-calendar').expect(200);
    expect(empty.body).toMatchObject({ items: [], noConsumption: [] });
  });

  it('entrada "Como é calculado" com a ressalva de consumo constante', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/kpis/calendar/explain').expect(200);
    expect(res.body.id).toBe('calendar');
    expect(JSON.stringify(res.body)).toMatch(/consumo constante/);
  });
});
