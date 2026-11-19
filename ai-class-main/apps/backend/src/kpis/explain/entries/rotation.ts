/** Conteúdo do painel "Como é calculado" do KPI rotação do stock (K2). Ligado ao framework pelo orquestrador. */
export default {
  id: 'rotation',
  title: 'Rotação do stock',
  formula:
    'Rotação = consumo estimado ÷ stock médio. Consumo estimado = média de avg_usage_per_day dos snapshots do artigo no período × dias do período (inclusivos). Stock médio = média de current_stock dos snapshots do artigo no período. Anualizada = rotação × 365 ÷ dias do período. Versão em valor (secundária) = consumo estimado × custo unitário médio do período ÷ média de stock_value. Agregada = soma dos consumos estimados ÷ soma dos stocks médios dos artigos com dados.',
  source: 'Slide 110 da apresentação do projeto; tabela fact_inventory_snapshot (inventory_data.csv).',
  columns: ['Date', 'Item_ID', 'Item_Name', 'Current_Stock', 'Unit_Cost', 'Avg_Usage_Per_Day'],
  unit: 'vezes no período (rotações); anualizada em vezes por ano',
  approximation:
    'Aproximação: o dataset não tem movimentos de saída, por isso o consumo é estimado a partir do consumo médio diário (avg_usage_per_day) multiplicado pelos dias do período. Sem filtro de período, os dias do período são o intervalo completo dos dados (primeira a última data de snapshot, inclusivos).',
  limitations: [
    'Cada artigo tem cerca de 10 snapshots: o stock médio é frágil e sensível a poucos pontos.',
    'O consumo estimado assume que o consumo médio diário observado se mantém em todo o período.',
    'Artigos sem snapshots no período não têm rotação (nulo) e contam em "sem dados", nunca como zero.',
    'A versão em valor é secundária; a versão principal é em unidades.',
    'Sem alvo definido: serve apenas para comparação entre artigos e períodos.',
  ],
};
