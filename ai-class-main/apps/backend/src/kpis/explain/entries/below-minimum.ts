export default {
  id: 'below-minimum',
  title: 'Artigos abaixo do stock mínimo',
  formula: 'abaixo = current_stock < min_required, no snapshot de referência de cada artigo. % = abaixo / artigos elegíveis × 100.',
  source: 'Enunciado (indicador mínimo); aula: stock mínimo / ponto de encomenda.',
  columns: ['current_stock', 'min_required', 'max_capacity'],
  unit: 'nº de artigos e % dos artigos elegíveis',
  approximation: 'Usa o último snapshot de cada artigo dentro do período (snapshot de referência), não uma média do período.',
  limitations: [
    'Artigos com min_required > max_capacity (dado incoerente) ficam fora da contagem e aparecem como "excluídos".',
    'Limiares: ≤ 5 % OK, ≤ 10 % atenção, > 10 % crítico.',
    'Um snapshot antigo (artigo sem registos recentes) é marcado como "desatualizado".',
    'Artigos sem snapshots no período não entram: aparecem em "sem dados no período".',
  ],
};
