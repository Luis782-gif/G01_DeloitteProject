// financial_data, patient_data e staff_data (ticket #6): normalizados e com qualidade assinalada, sem KPI.
import { clean, QualityEntry, Reject, run, toDate, toDecimal, toInt, toText, Transformed } from './transform';

export interface ExpenseRecord {
  line: number;
  date: string;
  category: string;
  amount: string;
  description: string;
}

export interface PatientRecord {
  line: number;
  patientId: string;
  admissionTs: string;
  dischargeTs: string;
  admissionDate: string;
  primaryDiagnosis: string;
  procedurePerformed: string;
  roomType: string;
  bedDays: number;
  equipmentUsed: string;
  supplies: string[];
  staffNeeds: { role: string; quantity: number }[];
  flagDischargeBeforeAdmission: boolean;
  flagBedDaysMismatch: boolean;
}

export interface StaffShiftRecord {
  line: number;
  staffId: string;
  staffType: string;
  shiftTs: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  currentAssignment: string;
  hoursWorked: number;
  patientsAssigned: number;
  overtimeHours: number;
  flagHoursMismatch: boolean;
}

type Flag = Omit<QualityEntry, 'line' | 'level'>;

const FINANCIAL_COLUMNS = ['Date', 'Expense_Category', 'Amount', 'Description'] as const;
const PATIENT_COLUMNS = [
  'Patient_ID', 'Admission_Date', 'Discharge_Date', 'Primary_Diagnosis', 'Procedure_Performed', 'Room_Type',
  'Bed_Days', 'Supplies_Used', 'Equipment_Used', 'Staff_Needed',
] as const;
const STAFF_COLUMNS = [
  'Staff_ID', 'Staff_Type', 'Shift_Date', 'Shift_Start_Time', 'Shift_End_Time', 'Current_Assignment',
  'Hours_Worked', 'Patients_Assigned', 'Overtime_Hours',
] as const;

const SMALLINT_MAX = 32767;
const DAY_MS = 86_400_000;
const NAME = /^[\p{L}][\p{L}\p{N} '\-./()]*$/u;

function toSmallint(raw: string, col: string): number {
  const n = toInt(raw, col);
  if (Math.abs(n) > SMALLINT_MAX) throw new Reject('R03', `Número fora do intervalo em ${col}: "${raw}"`);
  return n;
}

/** "YYYY-MM-DD HH:MM[:SS]" (ou com "T") -> texto normalizado "YYYY-MM-DD HH:MM:SS" e milissegundos (UTC). */
function toTimestamp(raw: string, col: string): { text: string; ms: number } {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw.trim());
  if (m) {
    const date = toDate(m[1], col);
    const ss = m[4] ?? '00';
    if (Number(m[2]) < 24 && Number(m[3]) < 60 && Number(ss) < 60) {
      return { text: `${date} ${m[2]}:${m[3]}:${ss}`, ms: Date.parse(`${date}T${m[2]}:${m[3]}:${ss}Z`) };
    }
  }
  throw new Reject('R02', `Data e hora inválidas em ${col}: "${raw}"`);
}

/** "08:00 AM" -> { text: "08:00:00", hours: 8 }. */
function toClock(raw: string, col: string): { text: string; hours: number } {
  const m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(raw.trim());
  if (m) {
    const h12 = Number(m[1]);
    const mi = Number(m[2]);
    if (h12 >= 1 && h12 <= 12 && mi < 60) {
      const h = (h12 % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0);
      return { text: `${String(h).padStart(2, '0')}:${m[2]}:00`, hours: h + mi / 60 };
    }
  }
  throw new Reject('R02', `Hora inválida em ${col}: "${raw}"`);
}

const singular = (role: string) => (/[^s]s$/i.test(role) ? role.slice(0, -1) : role);

/** "Gloves, IV" -> ["Gloves", "IV"]; null se a célula não for decomponível. */
export function parseSupplies(raw: string): string[] | null {
  const parts = raw.split(',').map(clean);
  if (parts.some((p) => !NAME.test(p))) return null;
  return [...new Set(parts)];
}

/** "1 Nurse, 2 Surgeons" -> [{Nurse,1},{Surgeon,2}] (papel no singular); null se não decomponível. */
export function parseStaffNeeds(raw: string): { role: string; quantity: number }[] | null {
  const byRole = new Map<string, number>();
  for (const part of raw.split(',').map(clean)) {
    const m = /^(\d+) (\S.*)$/.exec(part);
    if (!m || !NAME.test(m[2]) || Number(m[1]) < 1) return null;
    const role = singular(m[2]);
    byRole.set(role, (byRole.get(role) ?? 0) + Number(m[1]));
  }
  const out = [...byRole].map(([role, quantity]) => ({ role, quantity }));
  return out.every((o) => o.quantity <= SMALLINT_MAX) ? out : null;
}

/** Chave própria (R04): a data (um registo por dia). */
export function transformFinancial(text: string): Transformed<ExpenseRecord> {
  return run<ExpenseRecord>(
    text, 'financial_data.csv', FINANCIAL_COLUMNS,
    (get, line) => ({
      record: {
        line,
        date: toDate(get('Date'), 'Date'),
        category: toText(get('Expense_Category'), 'Expense_Category'),
        amount: toDecimal(get('Amount'), 'Amount'),
        description: toText(get('Description'), 'Description'),
      },
      flags: [],
    }),
    (r) => r.date,
  );
}

/** Chave própria (R04): `Patient_ID`. */
export function transformPatients(text: string): Transformed<PatientRecord> {
  return run<PatientRecord>(
    text, 'patient_data.csv', PATIENT_COLUMNS,
    (get, line) => {
      const patientId = toText(get('Patient_ID'), 'Patient_ID');
      const adm = toTimestamp(get('Admission_Date'), 'Admission_Date');
      const dis = toTimestamp(get('Discharge_Date'), 'Discharge_Date');
      const primaryDiagnosis = toText(get('Primary_Diagnosis'), 'Primary_Diagnosis');
      const procedurePerformed = toText(get('Procedure_Performed'), 'Procedure_Performed');
      const roomType = toText(get('Room_Type'), 'Room_Type');
      const bedDays = toSmallint(get('Bed_Days'), 'Bed_Days');
      const equipmentUsed = toText(get('Equipment_Used'), 'Equipment_Used');
      const rawSupplies = get('Supplies_Used');
      const rawStaff = get('Staff_Needed');

      const flags: Flag[] = [];
      const flagDischargeBeforeAdmission = dis.ms < adm.ms;
      const stayDays = (dis.ms - adm.ms) / DAY_MS;
      const flagBedDaysMismatch = Math.abs(bedDays - stayDays) > 1;
      if (flagDischargeBeforeAdmission) {
        flags.push({ rule: 'R20', message: `Alta (${dis.text}) anterior à admissão (${adm.text})` });
      }
      if (flagBedDaysMismatch) {
        flags.push({
          rule: 'R21',
          message: `Bed_Days ${bedDays} difere mais de 1 dia de (alta - admissão) = ${stayDays.toFixed(2)} dias`,
        });
      }
      const supplies = parseSupplies(rawSupplies);
      if (supplies === null) flags.push({ rule: 'R22', message: `Supplies_Used não decomponível: "${rawSupplies}"` });
      const staffNeeds = parseStaffNeeds(rawStaff);
      if (staffNeeds === null) flags.push({ rule: 'R22', message: `Staff_Needed não decomponível: "${rawStaff}"` });

      return {
        record: {
          line, patientId, admissionTs: adm.text, dischargeTs: dis.text, admissionDate: adm.text.slice(0, 10),
          primaryDiagnosis, procedurePerformed, roomType, bedDays, equipmentUsed,
          supplies: supplies ?? [], staffNeeds: staffNeeds ?? [],
          flagDischargeBeforeAdmission, flagBedDaysMismatch,
        },
        flags,
      };
    },
    (r) => r.patientId,
  );
}

/** Chave própria (R04): `Staff_ID`. */
export function transformStaff(text: string): Transformed<StaffShiftRecord> {
  return run<StaffShiftRecord>(
    text, 'staff_data.csv', STAFF_COLUMNS,
    (get, line) => {
      const staffId = toText(get('Staff_ID'), 'Staff_ID');
      const staffType = toText(get('Staff_Type'), 'Staff_Type');
      const shift = toTimestamp(get('Shift_Date'), 'Shift_Date');
      const start = toClock(get('Shift_Start_Time'), 'Shift_Start_Time');
      const end = toClock(get('Shift_End_Time'), 'Shift_End_Time');
      const currentAssignment = toText(get('Current_Assignment'), 'Current_Assignment');
      const hoursWorked = toSmallint(get('Hours_Worked'), 'Hours_Worked');
      const patientsAssigned = toSmallint(get('Patients_Assigned'), 'Patients_Assigned');
      const overtimeHours = toSmallint(get('Overtime_Hours'), 'Overtime_Hours');

      // Viragem de dia: se o fim é anterior ao início, o turno acaba no dia seguinte.
      const duration = (((end.hours - start.hours) % 24) + 24) % 24;
      const flagHoursMismatch = Math.abs(duration - hoursWorked) > 0.01;
      const flags: Flag[] = flagHoursMismatch
        ? [{
            rule: 'R30',
            message: `Duração do turno ${duration.toFixed(2)} h (${start.text} a ${end.text}) difere de Hours_Worked ${hoursWorked}`,
          }]
        : [];
      return {
        record: {
          line, staffId, staffType, shiftTs: shift.text, shiftDate: shift.text.slice(0, 10),
          startTime: start.text, endTime: end.text, currentAssignment, hoursWorked, patientsAssigned,
          overtimeHours, flagHoursMismatch,
        },
        flags,
      };
    },
    (r) => r.staffId,
  );
}
