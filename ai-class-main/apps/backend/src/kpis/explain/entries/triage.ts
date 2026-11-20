export default {
  id: 'triage',
  title: 'Nível de triagem (1 a 5)',
  formula:
    'nível = 1 + pontos de posição + pontos ABC. Posição: stock >= ponto de encomenda -> 0; consumo x tempo de reposição <= stock < ponto de encomenda -> +2; stock < consumo x tempo de reposição -> +3. Classe A -> +1. Se stock < min_required (e o registo não é R11, mínimo > máximo), nível = max(nível, 4).',
  source: 'Aula: stock de segurança e ponto de encomenda (slides 58-71) e classificação ABC (slide 19); combinação do projeto.',
  columns: ['current_stock', 'min_required', 'max_capacity', 'avg_usage_per_day', 'restock_lead_time_days', 'unit_cost'],
  unit: 'nível 1 a 5 por artigo no snapshot de referência',
  approximation: 'Heurística do projeto: não existe padrão da indústria para um score 1 a 5. Todos os cortes vêm de fórmulas da aula (ponto de encomenda, consumo x tempo de reposição, classe ABC); não há limiares inventados.',
  limitations: [
    'Artigos sem consumo (avg_usage_per_day = 0) não têm ponto de encomenda: ficam no nível 1 (a regra do mínimo ainda os pode subir a 4).',
    'O desvio-padrão do stock de segurança tem cerca de 10 observações por artigo (aviso de confiança baixa abaixo de 8).',
    'A classe ABC é calculada sobre todos os artigos do período, antes dos filtros de tipo, fornecedor, artigo e triagem.',
    'O nível de serviço por classe (95 % a 99 %) é parâmetro da API.',
  ],
};
