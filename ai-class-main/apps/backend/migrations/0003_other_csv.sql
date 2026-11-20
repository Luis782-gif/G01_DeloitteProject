-- Os outros três CSV (spec, secções 3.3 e 5). Ticket #6. Ficam fora dos KPI.
-- Sem CHECK nos valores: incoerências são assinaladas (R20, R21, R22, R30), não impedidas.

CREATE TABLE dim_expense_category (
  expense_category_id smallserial PRIMARY KEY,
  expense_category    text NOT NULL UNIQUE
);

CREATE TABLE fact_expense (
  expense_id          bigserial PRIMARY KEY,
  date_key            int NOT NULL REFERENCES dim_date (date_key),
  expense_category_id smallint NOT NULL REFERENCES dim_expense_category (expense_category_id),
  amount              numeric(14,2) NOT NULL,
  description         text NOT NULL,
  source_line         int NOT NULL,
  run_id              int NOT NULL REFERENCES etl_run (run_id),
  UNIQUE (date_key)  -- chave própria do ficheiro (R04): uma despesa por dia
);

CREATE TABLE patient_stay (
  patient_id                       text PRIMARY KEY,
  admission_ts                     timestamp NOT NULL,
  discharge_ts                     timestamp NOT NULL,
  admission_date_key               int NOT NULL REFERENCES dim_date (date_key),
  primary_diagnosis                text NOT NULL,
  procedure_performed              text NOT NULL,
  room_type                        text NOT NULL,
  bed_days                         smallint NOT NULL,
  equipment_used                   text NOT NULL,
  flag_discharge_before_admission  boolean NOT NULL,
  flag_bed_days_mismatch           boolean NOT NULL,
  source_line                      int NOT NULL,
  run_id                           int NOT NULL REFERENCES etl_run (run_id)
);

CREATE TABLE bridge_patient_supply (
  patient_id  text NOT NULL REFERENCES patient_stay (patient_id),
  supply_name text NOT NULL,
  PRIMARY KEY (patient_id, supply_name)
);

CREATE TABLE bridge_patient_staff_need (
  patient_id text NOT NULL REFERENCES patient_stay (patient_id),
  staff_role text NOT NULL,
  quantity   smallint NOT NULL,
  PRIMARY KEY (patient_id, staff_role)
);

CREATE TABLE staff_shift (
  staff_id           text PRIMARY KEY,
  staff_type         text NOT NULL,
  shift_ts           timestamp NOT NULL,
  shift_date_key     int NOT NULL REFERENCES dim_date (date_key),
  shift_start_time   time NOT NULL,
  shift_end_time     time NOT NULL,
  current_assignment text NOT NULL,
  hours_worked       smallint NOT NULL,
  patients_assigned  smallint NOT NULL,
  overtime_hours     smallint NOT NULL,
  flag_hours_mismatch boolean NOT NULL,
  source_line        int NOT NULL,
  run_id             int NOT NULL REFERENCES etl_run (run_id)
);
