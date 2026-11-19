/** Conteúdo do painel "Como é calculado" de K7b (ligado pelo framework do ticket #8). */
export default {
  id: 'idle-stock',
  title: 'Stock parado',
  formula: 'Σ máx(0, current_stock − X × avg_usage_per_day) × unit_cost, no snapshot de referência; X = 60 dias por defeito (parâmetro "dias").',
  source: 'inventory_data.csv (snapshot de referência por artigo, após os filtros globais)',
  columns: ['Current_Stock', 'Avg_Usage_Per_Day', 'Unit_Cost'],
  unit: '€',
  approximation:
    'Substitui "sem movimento há N dias", inviável porque o conjunto de dados não tem movimentos de saída: usa-se a autonomia (stock ÷ consumo diário) acima de X dias. Informativo, sem estado.',
  limitations: [
    'Os valores em € refletem custos unitários irrealistas: o Unit_Cost é aleatório por registo.',
    'Segunda vista do capital em excesso: nunca se soma a K7 (o mesmo stock pode contar nas duas).',
    'Assume consumo constante igual a Avg_Usage_Per_Day do snapshot de referência.',
  ],
};
