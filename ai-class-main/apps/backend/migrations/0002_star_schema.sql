-- Modelo em estrela do inventário e fornecedores (spec, secção 5). Ticket #4.
-- Os restantes CSV (financial, patient, staff) chegam no ticket #6.

CREATE TABLE dim_item_type (
  item_type_id smallserial PRIMARY KEY,
  item_type    text NOT NULL UNIQUE
);

-- ADR 0001: o artigo é o par (código, nome). Atributos que variam vivem no facto.
CREATE TABLE dim_item (
  item_sk   serial PRIMARY KEY,
  item_id   int  NOT NULL,
  item_name text NOT NULL,
  UNIQUE (item_id, item_name)
);

CREATE TABLE dim_vendor (
  vendor_id                text PRIMARY KEY,
  vendor_name              text NOT NULL,
  item_supplied            text NOT NULL,
  declared_lead_time_days  int  NOT NULL,
  cost_per_item            numeric(12,2) NOT NULL,
  last_order_date          date NOT NULL,
  next_delivery_date       date NOT NULL
);

CREATE TABLE dim_date (
  date_key int PRIMARY KEY,           -- yyyymmdd
  date     date NOT NULL UNIQUE,
  year     smallint NOT NULL,
  quarter  smallint NOT NULL,
  month    smallint NOT NULL,
  day      smallint NOT NULL
);

-- Ficheiros lidos por execução (alimenta o "byFile" do rodapé de qualidade).
CREATE TABLE etl_run_file (
  run_id        int  NOT NULL REFERENCES etl_run (run_id),
  source_file   text NOT NULL,
  rows_read     int  NOT NULL,
  rows_flagged  int  NOT NULL,
  rows_rejected int  NOT NULL,
  PRIMARY KEY (run_id, source_file)
);

-- Sem CHECK em unit_cost, restock_lead_time_days, etc.: violações são assinaladas (R12), não impedidas.
CREATE TABLE fact_inventory_snapshot (
  snapshot_id            bigserial PRIMARY KEY,
  date_key               int  NOT NULL REFERENCES dim_date (date_key),
  item_sk                int  NOT NULL REFERENCES dim_item (item_sk),
  item_type_id           smallint NOT NULL REFERENCES dim_item_type (item_type_id),
  vendor_id              text NOT NULL REFERENCES dim_vendor (vendor_id),
  current_stock          int  NOT NULL,
  min_required           int  NOT NULL,
  max_capacity           int  NOT NULL,
  unit_cost              numeric(12,2) NOT NULL,
  avg_usage_per_day      int  NOT NULL,
  restock_lead_time_days int  NOT NULL,
  stock_value            numeric NOT NULL,
  flag_stock_above_max   boolean NOT NULL,
  flag_min_above_max     boolean NOT NULL,
  source_line            int  NOT NULL,
  run_id                 int  NOT NULL REFERENCES etl_run (run_id),
  UNIQUE (date_key, item_sk)
);

CREATE TABLE etl_quality_log (
  log_id      bigserial PRIMARY KEY,
  run_id      int  NOT NULL REFERENCES etl_run (run_id),
  source_file text NOT NULL,
  source_line int  NOT NULL,
  rule_id     text NOT NULL,
  level       text NOT NULL CHECK (level IN ('reject', 'flag')),
  message     text NOT NULL
);
CREATE INDEX etl_quality_log_run ON etl_quality_log (run_id);
