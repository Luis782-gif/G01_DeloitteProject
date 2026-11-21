import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateTriage } from '../src/kpis/triage';
import { createTestApp, fixture, TestApp } from './harness/test-app';

const HEADER = 'Date,Item_ID,Item_Type,Item_Name,Current_Stock,Min_Required,Max_Capacity,Unit_Cost,Avg_Usage_Per_Day,Restock_Lead_Time,Vendor_ID';
const VENDORS =
  'Vendor_ID,Vendor_Name,Item_Supplied,Avg_Lead_Time (days),Cost_Per_Item,Last_Order_Date,Next_Delivery_Date\n' +
  'V1,Acme,Stuff,5,1.00,2025-01-01,2025-01-10\n' +
  'V2,Beta,Stuff,5,1.00,2025-01-01,2025-01-10\n';

/** Exemplo da aula (spec 12.4): consumo final 72, σ 5,593; com LT 2 e 98 %: SS 17, PE 161. */
const AULA = [70, 68, 75, 58, 64, 72, 74, 76, 82, 75, 71, 70, 67, 68, 72, 78, 80, 72];
const S98 = 'servicoA=98&servicoB=98&servicoC=98';

interface Case {
  name: string;
  stock: number;
  vendor?: string;
  type?: string;
  min?: number;
}

function csv(cases: Case[]): string {
  const rows: string[] = [];
  cases.forEach((c, i) => {
    AULA.forEach((u, k) => {
      const date = new Date(Date.UTC(2025, 0, 1 + k)).toISOString().slice(0, 10);
      rows.push(`${date},${i + 1},${c.type ?? 'Equipment'},${c.name},${c.stock},${c.min ?? 0},100000,1,${u},2,${c.vendor ?? 'V1'}`);
    });
  });
  return [HEADER, ...rows].join('\n') + '\n';
}

const dist = (counts: number[]) => counts.map((count, i) => ({ level: i + 1, count }));

describe('simulador "E se…?" (spec 8.6)', () => {
  let t: TestApp;
  let tmp: string | undefined;
  afterEach(async () => {
    await t?.close();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  async function load(cases: Case[]) {
    tmp = mkdtempSync(join(tmpdir(), 'sim-'));
    writeFileSync(join(tmp, 'inventory_data.csv'), csv(cases));
    writeFileSync(join(tmp, 'vendor_data.csv'), VENDORS);
    for (const f of ['financial_data.csv', 'patient_data.csv', 'staff_data.csv']) {
      writeFileSync(join(tmp, f), readFileSync(join(fixture('f1'), f), 'utf8'));
    }
    t = await createTestApp({ csvDir: tmp });
  }
  const sim = (body: object, qs = S98) => t.api.post(`/api/simulations?${qs}`).send(body);

  // Artigo único (classe A): stock 150, consumo 72, LT 2, SS 17, PE 161. Folga = 150/72 - 2 = 0,083.
  it('LT +1: folga 150/72 - 3 = -0,917 -> passa a negativa; SS 20, PE 236, nível 4 -> 5', async () => {
    await load([{ name: 'Aula', stock: 150 }]);
    // antes: 150 < PE 161 e >= 144 -> 1 + 2 + 1 (A) = 4. Depois: SS ceil(5,593*2,05*sqrt(3)) = 20, PE = 216 + 20; 150 < 216 -> 1 + 3 + 1 = 5.
    const res = await sim({ leadTimeDeltaDays: 1, usageDeltaPct: 0 }).expect(200);
    expect(res.body).toEqual({
      itemsTotal: 1,
      negativeSlackBefore: 0,
      negativeSlackAfter: 1,
      newNegativeSlack: 1,
      triageBefore: dist([0, 0, 0, 1, 0]),
      triageAfter: dist([0, 0, 0, 0, 1]),
    });
  });

  it('N = 0 e Y = 0: igual ao estado atual (e triageBefore = GET /triage/distribution)', async () => {
    await load([{ name: 'Aula', stock: 150 }, { name: 'Folgado', stock: 5000 }, { name: 'Curto', stock: 100, type: 'Supply' }]);
    const res = await sim({ leadTimeDeltaDays: 0, usageDeltaPct: 0 }).expect(200);
    const current = await t.api.get(`/api/triage/distribution?${S98}`).expect(200);
    expect(res.body.triageBefore).toEqual(current.body);
    expect(res.body.triageAfter).toEqual(current.body);
    expect(res.body.negativeSlackAfter).toBe(res.body.negativeSlackBefore);
    expect(res.body.newNegativeSlack).toBe(0);
    expect(res.body.negativeSlackBefore).toBe(1); // só "Curto": 100/72 - 2 = -0,611
    // corpo vazio = zero
    const empty = await t.api.post(`/api/simulations?${S98}`).send({}).expect(200);
    expect(empty.body).toEqual(res.body);
  });

  it('Y alto: consumo +100 % -> 144/dia, folga 150/144 - 2 = -0,958 -> negativa; SS 33, PE 321, nível 5', async () => {
    await load([{ name: 'Aula', stock: 150 }]);
    const res = await sim({ leadTimeDeltaDays: 0, usageDeltaPct: 100 }).expect(200);
    expect(res.body).toMatchObject({ negativeSlackBefore: 0, negativeSlackAfter: 1, newNegativeSlack: 1 });
    expect(res.body.triageAfter).toEqual(dist([0, 0, 0, 0, 1]));
  });

  it('folga já negativa antes não conta como "passa a negativa"', async () => {
    await load([{ name: 'Curto', stock: 100 }]); // 100/72 - 2 = -0,611
    const res = await sim({ leadTimeDeltaDays: 1, usageDeltaPct: 0 }).expect(200);
    expect(res.body).toMatchObject({ negativeSlackBefore: 1, negativeSlackAfter: 1, newNegativeSlack: 0 });
  });

  it('vendorId só afeta os artigos desse fornecedor', async () => {
    await load([{ name: 'DoV1', stock: 150, vendor: 'V1' }, { name: 'DoV2', stock: 150, vendor: 'V2' }]);
    const v2 = await sim({ leadTimeDeltaDays: 1, usageDeltaPct: 0, vendorId: 'V2' }).expect(200);
    expect(v2.body).toMatchObject({ itemsTotal: 2, negativeSlackAfter: 1, newNegativeSlack: 1 });
    const all = await sim({ leadTimeDeltaDays: 1, usageDeltaPct: 0 }).expect(200);
    expect(all.body).toMatchObject({ negativeSlackAfter: 2, newNegativeSlack: 2 });
  });

  it('filtro por tipo aplica-se ao universo do simulador', async () => {
    await load([{ name: 'Eq', stock: 150, type: 'Equipment' }, { name: 'Su', stock: 150, type: 'Supply' }]);
    const res = await sim({ leadTimeDeltaDays: 1, usageDeltaPct: 0 }, `${S98}&tipo=Supply`).expect(200);
    expect(res.body).toMatchObject({ itemsTotal: 1, newNegativeSlack: 1 });
  });

  it('validações -> 400 com { error, field }', async () => {
    await load([{ name: 'Aula', stock: 150 }]);
    const cases: [object, string][] = [
      [{ leadTimeDeltaDays: 61 }, 'leadTimeDeltaDays'],
      [{ leadTimeDeltaDays: -1 }, 'leadTimeDeltaDays'],
      [{ leadTimeDeltaDays: 'x' }, 'leadTimeDeltaDays'],
      [{ usageDeltaPct: 201 }, 'usageDeltaPct'],
      [{ usageDeltaPct: -5 }, 'usageDeltaPct'],
      [{ vendorId: 'NAO-EXISTE' }, 'vendorId'],
    ];
    for (const [body, field] of cases) {
      const res = await sim(body).expect(400);
      expect(res.body).toMatchObject({ field });
      expect(typeof res.body.error).toBe('string');
    }
    await sim({ leadTimeDeltaDays: 60, usageDeltaPct: 200 }).expect(200);
  });

  it('função pura = CTE SQL: o nível calculado em JS coincide com o de /triage/items em todos os casos', async () => {
    await load([
      { name: 'A', stock: 150 },
      { name: 'B', stock: 100 },
      { name: 'C', stock: 5000 },
      { name: 'D', stock: 200, min: 300 },
      { name: 'E', stock: 160 },
    ]);
    const items = (await t.api.get(`/api/triage/items?${S98}`).expect(200)).body.items;
    expect(items).toHaveLength(5);
    const rows = (
      await t.pool.query(
        `SELECT DISTINCT ON (f.item_sk) i.item_name, f.current_stock AS stock, f.min_required, f.flag_min_above_max AS r11, f.avg_usage_per_day AS usage, f.restock_lead_time_days AS lt
           FROM fact_inventory_snapshot f JOIN dim_item i ON i.item_sk = f.item_sk ORDER BY f.item_sk, f.date_key DESC`,
      )
    ).rows;
    for (const it of items) {
      const r = rows.find((x) => x.item_name === it.name);
      const out = evaluateTriage({ stock: r.stock, usage: r.usage, lt: r.lt, sigma: it.sigma, z: 2.05, class: it.class, minRequired: r.min_required, minAboveMax: r.r11 });
      expect({ name: it.name, level: out.level, ss: out.ss, pe: out.pe }).toEqual({ name: it.name, level: it.level, ss: it.safetyStock, pe: it.reorderPoint });
    }
  });
});
