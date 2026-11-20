export default {
  id: 'safety-stock',
  title: 'Stock de segurança',
  formula: 'SS = arredondar para cima (sigma x Z x raiz(LT)). sigma = desvio-padrão populacional (÷ n) de avg_usage_per_day do artigo em todos os snapshots até à data de corte; LT = tempo de reposição em dias; Z por classe: A 99 % (2,33), B 97,5 % (1,96), C 95 % (1,645).',
  source: 'Aula: stock de segurança (slides 58-61, 63-71, exemplo com Z = 2,05 e SS = 17).',
  columns: ['avg_usage_per_day', 'restock_lead_time_days', 'unit_cost', 'current_stock'],
  unit: 'unidades por artigo (arredondado para cima)',
  approximation: 'Assume consumo diário com distribuição aproximadamente normal e tempo de reposição constante. Heurística da aula, sem padrão da indústria para os níveis de serviço por classe.',
  limitations: [
    'Cerca de 10 observações por artigo no cálculo do sigma: abaixo de 8 observações assinala-se confiança baixa.',
    'Artigos sem consumo não têm stock de segurança.',
    'O nível de serviço por classe (95 % a 99 %) é parâmetro da API; o Z é o da aula para 99, 97,5 e 95 % e arredondado a 2 casas nos restantes.',
  ],
};
