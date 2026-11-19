export default {
  id: 'autonomy',
  title: 'Autonomia',
  formula: 'autonomia = current_stock / avg_usage_per_day (dias). Agregada: mediana dos artigos com consumo.',
  source: 'Aula: taxa de cobertura (slide 111); enunciado.',
  columns: ['current_stock', 'avg_usage_per_day'],
  unit: 'dias (por artigo no snapshot de referência; agregada pela mediana)',
  approximation: 'Assume consumo constante igual ao avg_usage_per_day do dia do snapshot.',
  limitations: [
    'Consumo 0: autonomia indefinida; o artigo fica "sem consumo" e fora da mediana (sem divisão por zero).',
    'A mediana é usada porque a distribuição tem caudas longas (máximo de 382 dias).',
    'Artigos sem snapshots no período não entram: aparecem em "sem dados no período".',
  ],
};
