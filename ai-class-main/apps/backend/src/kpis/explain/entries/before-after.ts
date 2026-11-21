/** Conteúdo do painel "Como é calculado" do antes vs. depois do capital imobilizado (spec 8.4). */
export default {
  id: 'before-after',
  title: 'Antes vs. depois do capital imobilizado',
  formula:
    'Regra explícita: liberta-se o capital em excesso (K7) dos artigos acima do máximo se as encomendas desses artigos forem suspensas até o stock voltar ao máximo. antes = valor de stock total (Σ current_stock × unit_cost no snapshot de referência, com os filtros); depois = antes − capital em excesso; libertado = capital em excesso, também em % do total.',
  source: 'inventory_data.csv (snapshot de referência por artigo, após os filtros globais)',
  columns: ['Current_Stock', 'Max_Capacity', 'Unit_Cost'],
  unit: '€ e % do valor total de stock',
  approximation: 'Aplica uma regra simples sobre o snapshot de referência: não prevê consumo nem preços, e não é uma previsão do que acontecerá.',
  limitations: [
    'Os valores em € refletem custos unitários irrealistas: o Unit_Cost é aleatório por registo, pelo que os montantes servem para comparar cenários e não como valores contabilísticos.',
    'Não é uma previsão: assume apenas que as encomendas dos artigos acima do máximo ficam suspensas até o stock voltar ao máximo.',
  ],
};
