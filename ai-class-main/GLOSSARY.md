# Aprovisionamento Hospitalar

Gestão de stock e prioridades de abastecimento de um hospital, do ponto de vista logístico (não clínico). O objetivo é reduzir o valor imobilizado sem comprometer a disponibilidade de materiais.

## Language

### Dados de stock

**Artigo** (`item`):
Um material ou equipamento gerido em stock, identificado pelo par (código do artigo, nome do artigo). Existem 50 artigos no conjunto de dados.
_Avoid_: Produto, SKU, referência, item (isoladamente), nome do artigo como identificador

**Snapshot** (`inventory_snapshot`):
O registo do estado de um único artigo num dia: stock, mínimo, máximo, custo unitário, consumo médio diário, tempo de reposição, tipo e fornecedor. Cada dia do período tem um snapshot de um só artigo, não do inventário completo.
_Avoid_: Linha de inventário, registo de stock, leitura

**Tipo de artigo** (`item_type`):
Classificação do artigo como consumível ou equipamento, tal como observada num snapshot. Pode diferir entre snapshots do mesmo artigo.
_Avoid_: Categoria

**Fornecedor** (`vendor`):
Entidade que abastece um artigo, tal como observada num snapshot. Pode diferir entre snapshots do mesmo artigo.
_Avoid_: Vendor, supplier

### Indicadores

**Tempo de reposição** (`lead_time`):
Dias entre a encomenda e a entrega de um artigo, lido do snapshot. É a fonte principal; o prazo declarado e as datas do ficheiro de fornecedores servem apenas de contraste ("prometido vs. real").
_Avoid_: Prazo de entrega, lead time

**Snapshot de referência**:
O último snapshot de cada artigo até à data de corte do período filtrado; é o "stock atual" desse artigo. Se tiver mais de 90 dias, o artigo aparece como dado desatualizado.
_Avoid_: Stock atual (sem qualificação), última leitura

**Autonomia** (`stock_cover_days`):
Número de dias que o stock de um artigo dura ao consumo médio diário.
_Avoid_: Cobertura, taxa de cobertura

**Dias de folga**:
Autonomia menos tempo de reposição; negativo significa rutura prevista antes da próxima entrega.
_Avoid_: Margem, buffer

**Rotação** (`stock_turnover`):
Consumo estimado de um artigo no período dividido pelo seu stock médio. O consumo é estimado a partir do consumo médio diário, porque o conjunto de dados não tem movimentos de saída.
_Avoid_: Rotatividade, giro

**Classe ABC**:
Prioridade de um artigo em três níveis pelo seu valor de stock no snapshot de referência: A até 80 % do valor acumulado, B até 95 %, C o resto.
_Avoid_: Prioridade ABC, categoria ABC

**Capital em excesso**:
Valor do stock acima do máximo de um artigo (unidades acima do máximo × custo unitário), no snapshot de referência. A autonomia acima de um limiar de dias é uma segunda vista, nunca somada a esta.
_Avoid_: Stock parado, stock dormente, sobrestock

**Stock parado**:
Stock de um artigo que excede o consumo previsível acima de um limiar de dias de autonomia (por defeito 60). Aproxima o conceito de "sem movimento há N dias", inviável porque o conjunto de dados não tem movimentos de saída.
_Avoid_: Stock dormente, stock sem movimento

**Nível de serviço**:
Probabilidade alvo de não haver rutura durante o tempo de reposição, definida por classe ABC (A 99 %, B 97,5 %, C 95 %) e usada para calcular o stock de segurança.
_Avoid_: Taxa de serviço, fill rate

**Stock de segurança**:
Quantidade mantida acima do consumo esperado durante o tempo de reposição, para proteger contra consumos acima do normal, dado o nível de serviço.
_Avoid_: Stock de proteção, buffer

**Ponto de encomenda**:
Nível de stock a que se deve encomendar: consumo médio durante o tempo de reposição mais o stock de segurança.
_Avoid_: Ponto de reposição, reorder point

**Nível de triagem**:
Nível de urgência de 1 a 5 atribuído a um artigo, que combina a posição do stock face ao ponto de encomenda e ao consumo durante o tempo de reposição com a classe ABC, para ordenar o que encomendar primeiro. Indicador próprio do projeto, construído a partir de fórmulas da bibliografia mas sem equivalente nela.
_Avoid_: Prioridade, urgência, score

### Qualidade dos dados

**Registo assinalado**:
Registo carregado que viola uma regra de domínio e fica marcado com o motivo, sem ser apagado.
_Avoid_: Registo inválido, registo sujo

**Registo rejeitado**:
Registo que não é carregado por ser estruturalmente ilegível (data ou número não interpretável, chave duplicada), com o motivo registado.
_Avoid_: Registo descartado, apagado

**Registo excluído do mínimo**:
Snapshot em que o stock mínimo excede a capacidade máxima: fica fora dos indicadores que usam o mínimo (artigos abaixo do mínimo e a regra do mínimo na triagem) mas conta nos restantes.
_Avoid_: Registo removido
