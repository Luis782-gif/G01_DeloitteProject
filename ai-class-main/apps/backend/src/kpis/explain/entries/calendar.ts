export default {
  id: 'calendar',
  title: 'Calendário de rutura iminente',
  formula: 'data de esgotamento = data do snapshot de referência + autonomia, com autonomia = stock atual / consumo médio diário, truncada ao dia (parte inteira, em dias).',
  source: 'Spec 8.2 (onda 2); autonomia da aula (K1).',
  columns: ['current_stock', 'avg_usage_per_day', 'snapshot_date'],
  unit: 'data (AAAA-MM-DD) por artigo; contagem de artigos por dia',
  approximation: 'Assume consumo constante: usa o consumo médio diário do snapshot de referência, sem sazonalidade, reposições ou encomendas em curso.',
  limitations: [
    'Assume consumo constante: é uma previsão, não uma rutura observada.',
    'Truncada ao dia: 1,824 dias de autonomia contam como 1 dia (esgotamento no dia seguinte ao snapshot).',
    'Artigos sem consumo (consumo médio 0) não têm data: aparecem à parte como "sem consumo".',
    'Se a data de esgotamento é anterior à data de corte do período, o artigo é marcado "já esgotado (dado desatualizado)": o snapshot é antigo e o stock real pode ter mudado.',
    'O tempo de reposição não afeta a data (um tempo inválido <= 0, regra R12, não altera a autonomia).',
    'Os filtros globais aplicam-se.',
  ],
};
