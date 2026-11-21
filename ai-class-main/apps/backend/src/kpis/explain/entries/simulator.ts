export default {
  id: 'simulator',
  title: 'Simulador "E se…?"',
  formula:
    'Dois parâmetros: tempo de reposição +N dias (global ou só de um fornecedor) e consumo +Y %. Para cada artigo no snapshot de referência recalcula: consumo = consumo x (1 + Y/100); σ = σ x (1 + Y/100); LT = LT + N; folga = stock / consumo - LT; SS = ⌈σ x Z x √LT⌉; PE = consumo x LT + SS; e o nível de triagem 1-5 com a mesma regra do estado atual.',
  source: 'Aula: stock de segurança e ponto de encomenda (slides 58-71) e a folga da secção 6.2 do projeto. Os cenários são uma decisão do projeto.',
  columns: ['current_stock', 'avg_usage_per_day', 'restock_lead_time_days', 'vendor_id', 'min_required'],
  unit: 'nº de artigos (folga negativa) e distribuição por nível de triagem',
  approximation:
    'Assume consumo constante e que o tempo de reposição só muda pelos dias indicados. Com N = 0 e Y = 0 o resultado é igual ao estado atual.',
  limitations: [
    'Simulação, não é uma previsão: só mostra quantos artigos passam a ter folga negativa e como muda a triagem.',
    'O consumo é constante (a mesma subida em todos os artigos); não há sazonalidade nem tendência.',
    'Artigos sem consumo ou com tempo de reposição inválido (<= 0) não têm folga e não são afetados pelo tempo de reposição.',
    'Não considera encomendas já em curso nem reposições futuras do stock.',
  ],
};
