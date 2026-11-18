import { mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, fixture, TestApp } from './harness/test-app';
import { loadCsvFolder } from '../src/etl/load-csv-folder';

describe('ETL dos 5 CSV (financial, patient, staff)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ csvDir: fixture('five') });
  });
  afterAll(async () => t?.close());

  it('GET /api/meta/data-quality soma os 5 ficheiros', async () => {
    const res = await t.api.get('/api/meta/data-quality').expect(200);
    expect(res.body.total).toMatchObject({ read: 19, treated: 14, flagged: 5, rejected: 0 });
    expect(res.body.byFile).toEqual([
      { file: 'financial_data.csv', read: 3, flagged: 0, rejected: 0 },
      { file: 'inventory_data.csv', read: 5, flagged: 1, rejected: 0 },
      { file: 'patient_data.csv', read: 5, flagged: 3, rejected: 0 },
      { file: 'staff_data.csv', read: 3, flagged: 1, rejected: 0 },
      { file: 'vendor_data.csv', read: 3, flagged: 0, rejected: 0 },
    ]);
  });

  it('financial_data -> fact_expense com categoria em lookup', async () => {
    const { rows } = await t.pool.query(
      `SELECT f.date_key, c.expense_category, f.amount::text AS amount, f.description, f.source_line
         FROM fact_expense f JOIN dim_expense_category c USING (expense_category_id) ORDER BY f.expense_id`,
    );
    expect(rows).toEqual([
      { date_key: 20241001, expense_category: 'Staffing', amount: '29391.86', description: 'Surgical masks', source_line: 2 },
      { date_key: 20241002, expense_category: 'Supplies', amount: '47757.71', description: 'Surgical masks', source_line: 3 },
      { date_key: 20241003, expense_category: 'Supplies', amount: '43996.60', description: 'Ventilators', source_line: 4 },
    ]);
  });

  it('listas decompostas nas tabelas ponte (papel no singular)', async () => {
    const staff = await t.pool.query(
      'SELECT patient_id, staff_role, quantity FROM bridge_patient_staff_need ORDER BY 1, 2',
    );
    expect(staff.rows).toEqual([
      { patient_id: 'P001', staff_role: 'Doctor', quantity: 1 },
      { patient_id: 'P001', staff_role: 'Nurse', quantity: 1 },
      { patient_id: 'P002', staff_role: 'Nurse', quantity: 1 },
      { patient_id: 'P003', staff_role: 'Surgeon', quantity: 2 },
      { patient_id: 'P005', staff_role: 'Doctor', quantity: 1 },
    ]);
    const sup = await t.pool.query('SELECT patient_id, supply_name FROM bridge_patient_supply ORDER BY 1, 2');
    expect(sup.rows).toEqual([
      { patient_id: 'P001', supply_name: 'Gloves' },
      { patient_id: 'P001', supply_name: 'IV' },
      { patient_id: 'P002', supply_name: 'Gown' },
      { patient_id: 'P002', supply_name: 'IV' },
      { patient_id: 'P003', supply_name: 'Gown' },
      { patient_id: 'P003', supply_name: 'Mask' },
      { patient_id: 'P005', supply_name: 'Gloves' },
    ]);
  });

  it('R20, R21 e R22 assinalam sem rejeitar (o registo mantém-se)', async () => {
    const stays = await t.pool.query(
      `SELECT patient_id, flag_discharge_before_admission AS r20, flag_bed_days_mismatch AS r21, bed_days,
              admission_ts::text AS admission_ts, admission_date_key
         FROM patient_stay ORDER BY patient_id`,
    );
    expect(stays.rows.map((r) => [r.patient_id, r.r20, r.r21])).toEqual([
      ['P001', false, false], ['P002', true, true], ['P003', false, false], ['P004', false, false], ['P005', false, true],
    ]);
    expect(stays.rows[0]).toMatchObject({ bed_days: 2, admission_ts: '2024-10-06 05:30:28', admission_date_key: 20241006 });
    const log = await t.pool.query(
      `SELECT source_line, rule_id FROM etl_quality_log WHERE source_file = 'patient_data.csv' ORDER BY source_line, rule_id`,
    );
    expect(log.rows).toEqual([
      { source_line: 3, rule_id: 'R20' }, { source_line: 3, rule_id: 'R21' },
      { source_line: 5, rule_id: 'R22' }, { source_line: 5, rule_id: 'R22' },
      { source_line: 6, rule_id: 'R21' },
    ]);
    // P004: listas não decomponíveis -> sem linhas na ponte
    const p4 = await t.pool.query(
      `SELECT (SELECT count(*)::int FROM bridge_patient_supply WHERE patient_id = 'P004') AS s,
              (SELECT count(*)::int FROM bridge_patient_staff_need WHERE patient_id = 'P004') AS n`,
    );
    expect(p4.rows[0]).toEqual({ s: 0, n: 0 });
  });

  it('staff_shift: horas em time, viragem de dia e R30', async () => {
    const { rows } = await t.pool.query(
      `SELECT staff_id, shift_ts::text AS shift_ts, shift_date_key, shift_start_time::text AS st,
              shift_end_time::text AS en, hours_worked, flag_hours_mismatch AS r30
         FROM staff_shift ORDER BY staff_id`,
    );
    expect(rows).toEqual([
      { staff_id: 'S001', shift_ts: '2024-10-03 05:51:36', shift_date_key: 20241003, st: '08:00:00', en: '18:00:00', hours_worked: 10, r30: false },
      { staff_id: 'S002', shift_ts: '2024-10-22 04:44:49', shift_date_key: 20241022, st: '18:00:00', en: '07:00:00', hours_worked: 13, r30: false },
      { staff_id: 'S003', shift_ts: '2024-10-15 15:11:14', shift_date_key: 20241015, st: '08:00:00', en: '18:00:00', hours_worked: 8, r30: true },
    ]);
  });

  it('dim_date cobre o intervalo dos 5 ficheiros (inventário até 2025-12-30, restantes desde 2024-10-01)', async () => {
    const d = await t.pool.query('SELECT min(date_key) AS a, max(date_key) AS b FROM dim_date');
    expect(d.rows[0]).toEqual({ a: 20241001, b: 20251230 });
  });

  it('idempotente: nova execução deixa as mesmas linhas', async () => {
    const count = async () =>
      (await t.pool.query(
        `SELECT (SELECT count(*) FROM fact_expense)::int e, (SELECT count(*) FROM patient_stay)::int p,
                (SELECT count(*) FROM bridge_patient_supply)::int s, (SELECT count(*) FROM bridge_patient_staff_need)::int n,
                (SELECT count(*) FROM staff_shift)::int h, (SELECT count(*) FROM etl_quality_log)::int q`,
      )).rows[0];
    const before = await count();
    await loadCsvFolder(t.pool, fixture('five'));
    expect(await count()).toEqual(before);
  });

  it('falta um dos 3 ficheiros novos: erro claro', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'etl-missing-'));
    try {
      for (const f of ['inventory_data.csv', 'vendor_data.csv', 'financial_data.csv', 'patient_data.csv']) {
        copyFileSync(join(fixture('five'), f), join(dir, f));
      }
      await expect(loadCsvFolder(t.pool, dir)).rejects.toThrow(/staff_data\.csv/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
