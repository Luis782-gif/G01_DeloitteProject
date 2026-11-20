export default {
  id: 'reorder-point',
  title: 'Ponto de encomenda',
  formula: 'PE = avg_usage_per_day x LT + SS, com consumo e tempo de reposição do snapshot de referência. Stock abaixo do PE: encomendar.',
  source: 'Aula: ponto de encomenda (slides 62 e 71); exemplo 72 x 2 + 17 = 161.',
  columns: ['avg_usage_per_day', 'restock_lead_time_days', 'current_stock'],
  unit: 'unidades por artigo no snapshot de referência',
  approximation: 'Assume consumo constante durante o tempo de reposição; o stock de segurança cobre a variabilidade (heurística da aula, sem padrão da indústria).',
  limitations: [
    'Depende do stock de segurança, que usa cerca de 10 observações por artigo no sigma.',
    'Não usa min_required, por isso os registos R11 (mínimo > máximo) não são excluídos.',
    'Artigos sem consumo não têm ponto de encomenda.',
  ],
};
