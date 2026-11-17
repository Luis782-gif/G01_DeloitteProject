-- Esqueleto (ticket #2): só a tabela etl_run da secção 5 da spec.
-- O restante esquema em estrela chega com o ETL (ticket #4).
CREATE TABLE etl_run (
  run_id        serial PRIMARY KEY,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  rows_read     int NOT NULL DEFAULT 0,
  rows_loaded   int NOT NULL DEFAULT 0,
  rows_flagged  int NOT NULL DEFAULT 0,
  rows_rejected int NOT NULL DEFAULT 0
);
