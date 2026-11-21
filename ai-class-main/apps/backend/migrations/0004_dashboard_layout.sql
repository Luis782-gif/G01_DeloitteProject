-- Layouts do dashboard por perfil (spec 5, 8.7). Fora do esquema em estrela: o ETL não lhe toca.
CREATE TABLE dashboard_layout (
  profile     text        PRIMARY KEY,
  layout_json jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
