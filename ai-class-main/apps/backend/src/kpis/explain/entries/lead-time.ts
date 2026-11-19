/** Entrada "Como é calculado" do KPI K3 (ligada ao framework pelo orquestrador). */
export default {
  id: 'lead-time',
  title: 'Tempo médio de reposição',
  formula:
    'Média de restock_lead_time_days dos snapshots do período (filtrados). Mostra também o desvio-padrão populacional (divisor N, não N-1) e o coeficiente de variação = desvio-padrão / média. Calcula-se global, por artigo e por fornecedor.',
  source:
    'Fonte principal: coluna Restock_Lead_Time do inventário (restock_lead_time_days em fact_inventory_snapshot). O vendor_data (tempo declarado e datas) não entra no cálculo: serve apenas de contraste "prometido vs. real" e cobre só 3 fornecedores.',
  columns: ['restock_lead_time_days', 'vendor_id', 'item_sk'],
  unit: 'dias',
  approximation:
    'Sem alvo: é um indicador de comparação (entre fornecedores e artigos). Um valor de reposição ≤ 0 é inválido (regra R12): fica assinalado e fora do KPI.',
  limitations: [
    'Cerca de 10 observações (snapshots) por artigo: médias e desvios por artigo são pouco estáveis; o coeficiente de variação por artigo deve ler-se com cautela.',
    'Desvio-padrão populacional: descreve os snapshots observados, não estima a variabilidade de uma população maior.',
    'O inventário regista o tempo de reposição de cada snapshot, não o tempo medido entre encomenda e entrega.',
  ],
};
