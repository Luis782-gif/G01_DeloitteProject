/** Entrada "Como é calculado" da tabela prometido vs. real (K12). */
export default {
  id: 'promised-vs-real',
  title: 'Prometido vs. real (prazo do fornecedor)',
  formula:
    'Por fornecedor: prazo declarado (Avg_Lead_Time do vendor_data), prazo pelas datas (Next_Delivery_Date - Last_Order_Date do vendor_data) e tempo médio de reposição do inventário (média de restock_lead_time_days, com os filtros globais).',
  source:
    'vendor_data (declarado e datas: V001 5/5, V002 30/44, V003 15/20 dias) contra o inventário. Só há 3 fornecedores em vendor_data.',
  columns: ['declared_lead_time_days', 'last_order_date', 'next_delivery_date', 'restock_lead_time_days'],
  unit: 'dias',
  approximation:
    'O prazo pelas datas vem de uma única encomenda por fornecedor; o tempo do inventário é uma média de snapshots. São medições de natureza diferente: a comparação é indicativa.',
  limitations: [
    'Uma única encomenda por fornecedor no vendor_data: sem variabilidade nem tendência.',
    'O vendor_data não é filtrado pelo período; só o tempo médio do inventário respeita os filtros.',
  ],
};
