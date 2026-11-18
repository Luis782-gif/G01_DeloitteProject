import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { ExpenseRecord, PatientRecord, StaffShiftRecord, transformFinancial, transformPatients, transformStaff } from './transform-other';
import { InventoryRecord, QualityEntry, transformInventory, transformVendors, VendorRecord } from './transform';

export const CSV_FILES = [
  'inventory_data.csv',
  'vendor_data.csv',
  'financial_data.csv',
  'patient_data.csv',
  'staff_data.csv',
] as const;

export interface EtlResult {
  runId: number;
  rowsRead: number;
  rowsLoaded: number;
  rowsFlagged: number;
  rowsRejected: number;
}

const ymd = (iso: string) => Number(iso.replaceAll('-', ''));

/**
 * ETL: lê os CSV da pasta e substitui, numa só transação, o conteúdo das dimensões, do facto e do
 * registo de qualidade da execução anterior. Idempotente: os mesmos CSV dão a mesma base de dados
 * (exceto `etl_run`/`etl_run_file`, que guardam o histórico das execuções). Nunca escreve nos CSV.
 */
export async function loadCsvFolder(pool: Pool, dir: string): Promise<EtlResult> {
  const read = (file: string) => {
    try {
      return readFileSync(join(dir, file), 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Ficheiro em falta: ${file} não existe em ${dir}. São necessários os 5 CSV: ${CSV_FILES.join(', ')}`);
      }
      throw e;
    }
  };
  // Leitura e validação antes de tocar na base: um ficheiro ilegível não deixa estado a meio.
  const vendors = transformVendors(read('vendor_data.csv'));
  const knownVendors = new Set(vendors.records.map((v) => v.vendorId));
  const inventory = transformInventory(read('inventory_data.csv'), knownVendors);
  const financial = transformFinancial(read('financial_data.csv'));
  const patients = transformPatients(read('patient_data.csv'));
  const staff = transformStaff(read('staff_data.csv'));
  const files = [
    ['inventory_data.csv', inventory], ['vendor_data.csv', vendors], ['financial_data.csv', financial],
    ['patient_data.csv', patients], ['staff_data.csv', staff],
  ] as const;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(4)');

    const rowsRead = files.reduce((n, [, t]) => n + t.rowsRead, 0);
    const rowsFlagged = files.reduce((n, [, t]) => n + t.rowsFlagged, 0);
    const rowsRejected = files.reduce((n, [, t]) => n + t.rowsRejected, 0);
    const rowsLoaded = files.reduce((n, [, t]) => n + t.records.length, 0);

    const { rows } = await client.query(
      `INSERT INTO etl_run (rows_read, rows_loaded, rows_flagged, rows_rejected)
       VALUES ($1, $2, $3, $4) RETURNING run_id`,
      [rowsRead, rowsLoaded, rowsFlagged, rowsRejected],
    );
    const runId: number = rows[0].run_id;

    await client.query(
      `TRUNCATE etl_quality_log, fact_inventory_snapshot, dim_item, dim_item_type, dim_vendor, dim_date,
                fact_expense, dim_expense_category, bridge_patient_supply, bridge_patient_staff_need, patient_stay,
                staff_shift RESTART IDENTITY`,
    );

    await insertDates(client, [
      ...inventory.records.map((r) => r.date), ...financial.records.map((r) => r.date),
      ...patients.records.map((r) => r.admissionDate), ...staff.records.map((r) => r.shiftDate),
    ]);
    await insertVendors(client, vendors.records);
    await insertInventory(client, runId, inventory.records);
    await insertExpenses(client, runId, financial.records);
    await insertPatients(client, runId, patients.records);
    await insertStaff(client, runId, staff.records);
    for (const [file, t] of files) {
      await insertLog(client, runId, file, t.log);
      await client.query(
        `INSERT INTO etl_run_file (run_id, source_file, rows_read, rows_flagged, rows_rejected)
         VALUES ($1, $2, $3, $4, $5)`,
        [runId, file, t.rowsRead, t.rowsFlagged, t.rowsRejected],
      );
    }
    await client.query('UPDATE etl_run SET finished_at = now() WHERE run_id = $1', [runId]);
    await client.query('COMMIT');
    return { runId, rowsRead, rowsLoaded, rowsFlagged, rowsRejected };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function insertVendors(c: PoolClient, vendors: VendorRecord[]) {
  for (const v of vendors) {
    await c.query(
      `INSERT INTO dim_vendor (vendor_id, vendor_name, item_supplied, declared_lead_time_days, cost_per_item,
                               last_order_date, next_delivery_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [v.vendorId, v.vendorName, v.itemSupplied, v.declaredLeadTimeDays, v.costPerItem, v.lastOrderDate, v.nextDeliveryDate],
    );
  }
}

async function insertInventory(c: PoolClient, runId: number, recs: InventoryRecord[]) {
  if (recs.length === 0) return;
  // Dimensões, depois facto. Ordem determinística para que os ids sejam iguais em cada execução.
  const types = [...new Set(recs.map((r) => r.itemType))].sort();
  for (const t of types) await c.query('INSERT INTO dim_item_type (item_type) VALUES ($1)', [t]);
  const items = [...new Map(recs.map((r) => [`${r.itemId}|${r.itemName}`, r] as const)).values()].sort(
    (a, b) => a.itemId - b.itemId || (a.itemName < b.itemName ? -1 : a.itemName > b.itemName ? 1 : 0),
  );
  for (const i of items) await c.query('INSERT INTO dim_item (item_id, item_name) VALUES ($1, $2)', [i.itemId, i.itemName]);

  const itemSk = new Map((await c.query('SELECT item_sk, item_id, item_name FROM dim_item')).rows.map(
    (r) => [`${r.item_id}|${r.item_name}`, r.item_sk as number] as const));
  const typeId = new Map((await c.query('SELECT item_type_id, item_type FROM dim_item_type')).rows.map(
    (r) => [r.item_type as string, r.item_type_id as number] as const));

  const ordered = [...recs].sort((a, b) => a.line - b.line);
  for (const r of ordered) {
    await c.query(
      `INSERT INTO fact_inventory_snapshot
         (date_key, item_sk, item_type_id, vendor_id, current_stock, min_required, max_capacity, unit_cost,
          avg_usage_per_day, restock_lead_time_days, stock_value, flag_stock_above_max, flag_min_above_max,
          source_line, run_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$5::int * $8::numeric,$11,$12,$13,$14)`,
      [
        ymd(r.date), itemSk.get(`${r.itemId}|${r.itemName}`), typeId.get(r.itemType), r.vendorId, r.currentStock,
        r.minRequired, r.maxCapacity, r.unitCost, r.avgUsagePerDay, r.restockLeadTimeDays,
        r.flagStockAboveMax, r.flagMinAboveMax, r.line, runId,
      ],
    );
  }
}

/** dim_date cobre o intervalo de datas de todos os ficheiros carregados. */
async function insertDates(c: PoolClient, dates: string[]) {
  if (dates.length === 0) return;
  const sorted = [...dates].sort();
  await c.query(
    `INSERT INTO dim_date (date_key, date, year, quarter, month, day)
     SELECT to_char(d, 'YYYYMMDD')::int, d::date, extract(year from d), extract(quarter from d),
            extract(month from d), extract(day from d)
       FROM generate_series($1::date, $2::date, interval '1 day') AS g(d)`,
    [sorted[0], sorted[sorted.length - 1]],
  );
}

async function insertExpenses(c: PoolClient, runId: number, recs: ExpenseRecord[]) {
  for (const cat of [...new Set(recs.map((r) => r.category))].sort()) {
    await c.query('INSERT INTO dim_expense_category (expense_category) VALUES ($1)', [cat]);
  }
  const catId = new Map((await c.query('SELECT expense_category_id, expense_category FROM dim_expense_category')).rows.map(
    (r) => [r.expense_category as string, r.expense_category_id as number] as const));
  for (const r of [...recs].sort((a, b) => a.line - b.line)) {
    await c.query(
      `INSERT INTO fact_expense (date_key, expense_category_id, amount, description, source_line, run_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ymd(r.date), catId.get(r.category), r.amount, r.description, r.line, runId],
    );
  }
}

async function insertPatients(c: PoolClient, runId: number, recs: PatientRecord[]) {
  for (const r of [...recs].sort((a, b) => a.line - b.line)) {
    await c.query(
      `INSERT INTO patient_stay (patient_id, admission_ts, discharge_ts, admission_date_key, primary_diagnosis,
         procedure_performed, room_type, bed_days, equipment_used, flag_discharge_before_admission,
         flag_bed_days_mismatch, source_line, run_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [r.patientId, r.admissionTs, r.dischargeTs, ymd(r.admissionDate), r.primaryDiagnosis, r.procedurePerformed,
        r.roomType, r.bedDays, r.equipmentUsed, r.flagDischargeBeforeAdmission, r.flagBedDaysMismatch, r.line, runId],
    );
    for (const supply of r.supplies) {
      await c.query('INSERT INTO bridge_patient_supply (patient_id, supply_name) VALUES ($1, $2)', [r.patientId, supply]);
    }
    for (const n of r.staffNeeds) {
      await c.query(
        'INSERT INTO bridge_patient_staff_need (patient_id, staff_role, quantity) VALUES ($1, $2, $3)',
        [r.patientId, n.role, n.quantity],
      );
    }
  }
}

async function insertStaff(c: PoolClient, runId: number, recs: StaffShiftRecord[]) {
  for (const r of [...recs].sort((a, b) => a.line - b.line)) {
    await c.query(
      `INSERT INTO staff_shift (staff_id, staff_type, shift_ts, shift_date_key, shift_start_time, shift_end_time,
         current_assignment, hours_worked, patients_assigned, overtime_hours, flag_hours_mismatch, source_line, run_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [r.staffId, r.staffType, r.shiftTs, ymd(r.shiftDate), r.startTime, r.endTime, r.currentAssignment,
        r.hoursWorked, r.patientsAssigned, r.overtimeHours, r.flagHoursMismatch, r.line, runId],
    );
  }
}

async function insertLog(c: PoolClient, runId: number, file: string, entries: QualityEntry[]) {
  for (const e of entries) {
    await c.query(
      `INSERT INTO etl_quality_log (run_id, source_file, source_line, rule_id, level, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [runId, file, e.line, e.rule, e.level, e.message],
    );
  }
}

