/** Conteúdo do painel "Como é calculado" de K7 (ligado pelo framework do ticket #8). */
export default {
  id: 'excess-capital',
  title: 'Capital em excesso',
  formula: 'Σ máx(0, current_stock − max_capacity) × unit_cost, no snapshot de referência de cada artigo; em % do valor total de stock (Σ current_stock × unit_cost).',
  source: 'inventory_data.csv (snapshot de referência por artigo, após os filtros globais)',
  columns: ['Current_Stock', 'Max_Capacity', 'Unit_Cost'],
  unit: '€ e % do valor total de stock',
  approximation:
    'O máximo (max_capacity) é a política do hospital, não um óptimo calculado. Os registos com mínimo superior ao máximo entram (só usam o máximo). Estado: ≤ 5 % OK, ≤ 10 % atenção, > 10 % crítico (parametrizável).',
  limitations: [
    'Os valores em € refletem custos unitários irrealistas: o Unit_Cost é aleatório por registo (ex.: uma máscara a 8 393 €), pelo que os montantes servem para comparar artigos e não como valores contabilísticos.',
    'Não é somado ao stock parado: são duas vistas do mesmo stock, nunca somar.',
    'Artigos sem snapshots no período ficam fora do cálculo (contados à parte, nunca como zero).',
  ],
};
