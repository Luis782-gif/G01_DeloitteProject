export default {
  id: 'slack-days',
  title: 'Dias de folga',
  formula: 'folga = autonomia - restock_lead_time_days. OK se folga >= 7; atenção de 0 a 7; crítico se folga < 0 (limiares parametrizáveis).',
  source: 'Aula: ponto de encomenda (slide 62); combinação do projeto.',
  columns: ['current_stock', 'avg_usage_per_day', 'restock_lead_time_days'],
  unit: 'dias (por artigo no snapshot de referência; agregada pela mediana)',
  approximation: 'Assume consumo constante e tempo de reposição igual ao do snapshot de referência.',
  limitations: [
    'Folga negativa significa rutura prevista antes de a próxima entrega chegar.',
    'Artigos sem consumo não têm folga e ficam fora da mediana e das contagens.',
    'Os limiares 7 e 0 dias são parâmetros, não padrões da indústria.',
  ],
};
