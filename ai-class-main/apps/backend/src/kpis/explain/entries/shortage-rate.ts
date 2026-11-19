export default {
  id: 'shortage-rate',
  title: 'Rutura prevista',
  formula: 'rutura prevista = artigos com dias de folga < 0 / artigos com folga calculável x 100.',
  source: 'Aula: taxa de rutura (slide 112), aproximada.',
  columns: ['current_stock', 'avg_usage_per_day', 'restock_lead_time_days'],
  unit: '% de artigos no snapshot de referência',
  approximation: 'Aproxima a taxa de rutura real: não há requisições, só a previsão por consumo constante.',
  limitations: [
    'Coincide com a contagem de artigos no estado crítico dos dias de folga.',
    'Artigos sem consumo ficam fora do denominador.',
    'Não é uma rutura observada: é uma previsão.',
  ],
};
