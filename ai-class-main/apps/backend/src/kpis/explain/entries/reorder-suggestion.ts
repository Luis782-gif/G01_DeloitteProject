export default {
  id: 'reorder-suggestion',
  title: 'Sugestão de encomenda',
  formula:
    'Artigos com stock < PE (PE = consumo x LT + SS). Quantidade sugerida = stock máximo - stock (nunca negativa). Se o máximo for inconsistente (mínimo > máximo, R11) ou inferior ao PE: PE - stock.',
  source: 'Aula: ponto de encomenda (slides 62 e 71). A regra da quantidade é uma decisão do projeto (heurística), não vem da aula.',
  columns: ['current_stock', 'max_capacity', 'avg_usage_per_day', 'restock_lead_time_days'],
  unit: 'unidades por artigo no snapshot de referência',
  approximation:
    'Heurística sem quantidade económica de encomenda (QEE): repõe até ao stock máximo, sem custos de encomenda nem de posse. Assume consumo constante durante o tempo de reposição.',
  limitations: [
    'Não há QEE: a quantidade sugerida não minimiza custos.',
    'O stock de segurança usa cerca de 10 observações por artigo no sigma (confiança baixa com menos de 8).',
    'Assume consumo constante; artigos sem consumo não têm PE e ficam fora da lista.',
    'Não considera encomendas já em curso.',
  ],
};
