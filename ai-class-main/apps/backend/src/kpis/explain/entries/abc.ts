export default {
  id: 'abc',
  title: 'Classe ABC (Pareto)',
  formula:
    'Valor de stock = current_stock × unit_cost no snapshot de referência de cada artigo. Ordenar por valor decrescente; % acumulada = soma dos valores até ao artigo / total. Classe A se % acumulada ≤ corte A, B se ≤ corte B, C caso contrário; o primeiro artigo é sempre A.',
  source: 'fact_inventory_snapshot (snapshot de referência por artigo no período)',
  columns: ['current_stock', 'unit_cost'],
  unit: 'classe A / B / C; valor em €',
  approximation:
    'ABC por valor de stock (como o enunciado), não por consumo anual (como a aula). Cortes por defeito 80/95 (parâmetros cutA e cutB). A classe calcula-se sobre todos os artigos do período, antes dos filtros de tipo e fornecedor.',
  limitations: [
    'O unit_cost é aleatório por registo (snapshot): a classe reflete o snapshot, não o valor estrutural do artigo.',
    'Artigos com valor 0 ficam na classe C.',
    'Os cortes 80/95 são orientações, não regras rígidas; o exemplo da aula usa 66/91.',
  ],
};
