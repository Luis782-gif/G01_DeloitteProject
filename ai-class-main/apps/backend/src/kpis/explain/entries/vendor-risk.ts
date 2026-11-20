/** Entrada "Como é calculado" do índice de risco do fornecedor (K11). */
export default {
  id: 'vendor-risk',
  title: 'Índice de risco do fornecedor',
  formula:
    'Média dos ranks (1 = melhor) do fornecedor em três componentes: tempo médio de reposição, coeficiente de variação (desvio-padrão populacional / média) e % de artigos em risco (folga < 0 no snapshot de referência). Pesos iguais (decisão da equipa). Empates recebem o rank médio (dois fornecedores empatados em 2.º ficam ambos com 2,5). Menor índice = menor risco.',
  source:
    'Inventário (Restock_Lead_Time, Current_Stock, Avg_Usage_Per_Day) por Vendor_ID, com os filtros globais aplicados. É uma ordenação relativa entre os fornecedores visíveis, não um valor absoluto.',
  columns: ['restock_lead_time_days', 'current_stock', 'avg_usage_per_day', 'vendor_id'],
  unit: 'rank médio (1 a N)',
  approximation:
    'Os ranks ignoram a dimensão das diferenças: com médias de 14,85 e 15,55 dias o rank diferencia, mas a diferença é inferior a 1 dia. Por isso a página diz "nenhum fornecedor se distingue" quando a diferença entre o maior e o menor tempo médio é < 1 dia (parâmetro distinguishDays).',
  limitations: [
    'Cerca de 10 observações por artigo: base fraca para variabilidade e sazonalidade.',
    'Pesos iguais são uma escolha, não uma medida de importância relativa.',
    'Só há 3 fornecedores: os ranks são 1, 2 ou 3 e mudam facilmente com pequenas diferenças.',
  ],
};
