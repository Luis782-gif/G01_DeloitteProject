import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, fixture, TestApp } from './harness/test-app';

const HEADER = 'Date,Item_ID,Item_Type,Item_Name,Current_Stock,Min_Required,Max_Capacity,Unit_Cost,Avg_Usage_Per_Day,Restock_Lead_Time,Vendor_ID';
const VENDORS =
  'Vendor_ID,Vendor_Name,Item_Supplied,Avg_Lead_Time (days),Cost_Per_Item,Last_Order_Date,Next_Delivery_Date\n' +
  'V1,Acme,Stuff,5,1.00,2025-01-01,2025-01-10\n';

/** Exemplo da aula (slides 63-71, spec 12.4): as 18 semanas, com um 72 movido para o fim (σ não depende da ordem). */
const AULA = [70, 68, 75, 58, 64, 72, 74, 76, 82, 75, 71, 70, 67, 68, 72, 78, 80, 72];
const SERVICE_98 = 'servicoA=98&servicoB=98&servicoC=98';

interface Case {
  name: string;
  stock: number;
  unitCost: number;
  min?: number;
  max?: number;
  usage?: number[];
  lt?: number;
}

/** 1 linha por snapshot (datas consecutivas); o último é o snapshot de referência. */
function csv(cases: Case[]): string {
  const rows: string[] = [];
  cases.forEach((c, i) => {
    const usage = c.usage ?? AULA;
    usage.forEach((u, k) => {
      const date = new Date(Date.UTC(2025, 0, 1 + k)).toISOString().slice(0, 10);
      rows.push(`${date},${i + 1},Equipment,${c.name},${c.stock},${c.min ?? 0},${c.max ?? 100000},${c.unitCost},${u},${c.lt ?? 2},V1`);
    });
  });
  return [HEADER, ...rows].join('\n') + '\n';
}

describe('triagem 1-5 (K8, K9, K10)', () => {
  let t: TestApp;
  let tmp: string | undefined;
  afterEach(async () => {
    await t?.close();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  async function load(cases: Case[]) {
    tmp = mkdtempSync(join(tmpdir(), 'triage-'));
    writeFileSync(join(tmp, 'inventory_data.csv'), csv(cases));
    writeFileSync(join(tmp, 'vendor_data.csv'), VENDORS);
    for (const f of ['financial_data.csv', 'patient_data.csv', 'staff_data.csv']) {
      writeFileSync(join(tmp, f), readFileSync(join(fixture('f1'), f), 'utf8'));
    }
    t = await createTestApp({ csvDir: tmp });
  }

  it('exemplo da aula: σ 5,59, Z 2,05 (98 %), LT 2 -> SS 17 e PE 161', async () => {
    await load([{ name: 'Aula', stock: 200, unitCost: 1 }]);
    const res = await t.api.get(`/api/triage/items?${SERVICE_98}`).expect(200);
    expect(res.body.z).toEqual({ A: 2.05, B: 2.05, C: 2.05 });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ sigma: 5.593, safetyStock: 17, reorderPoint: 161, usage: 72, leadTime: 2, observations: 18, lowConfidence: false });
  });

  it('Z por defeito por classe: A 2,33, B 1,96, C 1,645', async () => {
    await load([{ name: 'Aula', stock: 200, unitCost: 1 }]);
    const res = await t.api.get('/api/triage/items').expect(200);
    expect(res.body.z).toEqual({ A: 2.33, B: 1.96, C: 1.645 });
    expect(res.body.service).toEqual({ A: 99, B: 97.5, C: 95 });
  });

  // Classes forçadas por valor (stock × custo) e cortes 88/89: A = três primeiros, C = os restantes.
  const TABLE: [Case, number][] = [
    [{ name: 'C100', stock: 100, unitCost: 100 }, 4], // 1 + 3 + 0
    [{ name: 'A150', stock: 150, unitCost: 1000 }, 4], // 1 + 2 + 1
    [{ name: 'C200', stock: 200, unitCost: 100 }, 1], // 1 + 0 + 0
    [{ name: 'A100', stock: 100, unitCost: 1000 }, 5], // 1 + 3 + 1
    [{ name: 'A200', stock: 200, unitCost: 1000 }, 2], // 1 + 0 + 1
    [{ name: 'C200min', stock: 200, unitCost: 100, min: 300 }, 4], // abaixo do mínimo elegível: max(1, 4)
    [{ name: 'C200r11', stock: 200, unitCost: 100, min: 300, max: 150 }, 1], // R11: regra do mínimo não se aplica
  ];

  it('tabela de triagem (spec 12.5): consumo 72, LT 2, SS 17, PE 161', async () => {
    await load(TABLE.map(([c]) => c));
    const qs = `${SERVICE_98}&cutA=88&cutB=89`;
    const res = await t.api.get(`/api/triage/items?${qs}`).expect(200);
    const byName = Object.fromEntries(res.body.items.map((i: { name: string }) => [i.name, i]));
    for (const [c, level] of TABLE) {
      expect({ name: c.name, level: byName[c.name].level, class: byName[c.name].class, ss: byName[c.name].safetyStock, pe: byName[c.name].reorderPoint }).toEqual({
        name: c.name,
        level,
        class: c.name.startsWith('A') ? 'A' : 'C',
        ss: 17,
        pe: 161,
      });
    }
    const dist = await t.api.get(`/api/triage/distribution?${qs}`).expect(200);
    expect(dist.body).toEqual([
      { level: 1, count: 2 },
      { level: 2, count: 1 },
      { level: 3, count: 0 },
      { level: 4, count: 3 },
      { level: 5, count: 1 },
    ]);
  });

  it('filtro triagem (lista) aplica-se aos KPI existentes e à distribuição', async () => {
    await load(TABLE.map(([c]) => c));
    const qs = `${SERVICE_98}&cutA=88&cutB=89`;
    const all = await t.api.get(`/api/kpis/below-minimum?${qs}`).expect(200);
    expect(all.body).toMatchObject({ count: 1, eligible: 6, excluded: 1 });
    const only1 = await t.api.get(`/api/kpis/below-minimum?${qs}&triagem=1`).expect(200);
    expect(only1.body).toMatchObject({ count: 0, eligible: 1, excluded: 1 });
    const four = await t.api.get(`/api/kpis/below-minimum?${qs}&triagem=4,5`).expect(200);
    expect(four.body).toMatchObject({ count: 1, eligible: 4, excluded: 0 });
    const dist = await t.api.get(`/api/triage/distribution?${qs}&triagem=4,5`).expect(200);
    expect(dist.body.map((d: { count: number }) => d.count)).toEqual([0, 0, 0, 3, 1]);
  });

  it('valores inválidos -> 400', async () => {
    await load([{ name: 'Aula', stock: 200, unitCost: 1 }]);
    for (const q of ['servicoA=94', 'servicoB=99.5', 'servicoC=abc', 'triagem=6', 'triagem=0', 'triagem=a,1']) {
      const res = await t.api.get(`/api/triage/items?${q}`).expect(400);
      expect(res.body).toHaveProperty('field');
    }
  });

  it('confiança baixa com menos de 8 observações; sem consumo -> nível 1 sem SS nem PE', async () => {
    await load([
      { name: 'Poucos', stock: 10, unitCost: 1, usage: [70, 68, 75, 72, 58, 64, 72] },
      { name: 'Parado', stock: 10, unitCost: 1, usage: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ]);
    const res = await t.api.get('/api/triage/items').expect(200);
    const byName = Object.fromEntries(res.body.items.map((i: { name: string }) => [i.name, i]));
    expect(byName.Poucos).toMatchObject({ observations: 7, lowConfidence: true });
    expect(byName.Parado).toMatchObject({ noConsumption: true, safetyStock: null, reorderPoint: null, level: 1, lowConfidence: false });
  });

  it('sem dados: distribuição com 5 níveis a zero', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/triage/distribution').expect(200);
    expect(res.body).toEqual([1, 2, 3, 4, 5].map((level) => ({ level, count: 0 })));
  });
});
