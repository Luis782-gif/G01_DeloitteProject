# Qualidade dos dados

Perfil inicial dos 5 CSV de `2-Hospital_Dataset` (cópia original, nunca alterada) e regras de conformidade. Os valores desta versão foram calculados diretamente dos ficheiros; a partir da primeira execução do ETL, este documento é **gerado e atualizado pelo ETL** (ver `docs/spec.md`, secção 4).

Âmbito do ETL: os **5 ficheiros** são carregados (exigência do enunciado). `inventory_data` e `vendor_data` alimentam os KPI; `financial_data`, `patient_data` e `staff_data` ficam normalizados e com qualidade assinalada, mas sem KPI (ver `docs/spec.md`, secções 3.3 e 14).

## 1. Resumo

| Ficheiro | Linhas | Período | Nulos | Chave única | Papel |
|---|---|---|---|---|---|
| `inventory_data.csv` | 500 | 2024-10-01 → 2026-02-12 | 0 | `Date` (500 distintas); sem linhas duplicadas | Facto principal |
| `vendor_data.csv` | 3 | datas em 2024-09 e 2024-10 | 0 | `Vendor_ID` | Dimensão e contraste "prometido vs. real" |
| `financial_data.csv` | 500 | 2024-10-01 → 2026-02-12 | 0 | `Date` | Carregado, sem KPI |
| `patient_data.csv` | 500 | 2024-10-01 → 2024-10-31 | 0 | `Patient_ID` | Carregado, sem KPI |
| `staff_data.csv` | 500 | 2024-10-01 → 2024-10-29 | 0 | `Staff_ID` | Carregado, sem KPI |

## 2. `inventory_data.csv`

| Coluna | Tipo alvo | Nulos | Distintos | Mínimo → máximo / valores |
|---|---|---|---|---|
| `Date` | date | 0 | 500 | 2024-10-01 → 2026-02-12 |
| `Item_ID` | int | 0 | 10 | 100 → 109 |
| `Item_Type` | texto (lista fechada) | 0 | 2 | Consumable 266, Equipment 234 |
| `Item_Name` | texto | 0 | 5 | IV Drip 109, Gloves 99, Surgical Mask 98, X-ray Machine 98, Ventilator 96 |
| `Current_Stock` | int | 0 | 475 | 69 → 4976 |
| `Min_Required` | int | 0 | 393 | 10 → 995 |
| `Max_Capacity` | int | 0 | 480 | 500 → 5992 |
| `Unit_Cost` | decimal | 0 | 500 | 4,23 → 19 984,16 |
| `Avg_Usage_Per_Day` | int | 0 | 317 | 2 → 499 |
| `Restock_Lead_Time` | int (dias) | 0 | 29 | 1 → 29 |
| `Vendor_ID` | texto | 0 | 3 | V001 188, V002 156, V003 156 |

Estrutura e identidade:
- **Um registo por dia**: 500 datas distintas em 500 linhas. Cada dia é o snapshot de **um só artigo**, não do inventário completo.
- **Artigos**: 10 códigos × 5 nomes. Existem 50 pares `(Item_ID, Item_Name)`, com 5 a 21 snapshots cada (mediana 9,5). O código não determina o nome (viola a 2NF/3NF). Decisão: o artigo é o par (ADR 0001).
- **Atributos instáveis por artigo**: 49 dos 50 artigos aparecem com os dois tipos (`Consumable` e `Equipment`) e os 50 aparecem com mais de um fornecedor. Os dois tipos aparecem em todos os 5 nomes.
- **`Unit_Cost` não é propriedade do artigo**: varia ao acaso por registo (ex.: "Gloves" de 159 a 19 913, "Ventilator" de 4 a 19 414). Luvas e máscaras a ~10 000 € não têm realismo. Os valores mantêm-se e o problema fica como limitação do dataset, não como flag por linha.

Verificações de domínio (sobre os 500 registos):

| Regra | Violações | % | Tratamento |
|---|---|---|---|
| `Current_Stock ≥ 0` | 0 | 0 % | Assinalar e excluir dos KPI que usam a coluna |
| `Unit_Cost > 0` | 0 | 0 % | Idem |
| `Avg_Usage_Per_Day ≥ 0` | 0 | 0 % | Idem |
| `Restock_Lead_Time > 0` | 0 | 0 % | Idem |
| `Item_Type` na lista válida | 0 | 0 % | Assinalar |
| `Current_Stock > Max_Capacity` (F01) | 186 | 37,2 % | Assinalar. Entra no capital em excesso |
| `Min_Required > Max_Capacity` (F02) | 13 | 2,6 % | Assinalar. **Excluir dos KPI que dependem do mínimo** |
| `Avg_Usage_Per_Day = 0` | 0 | 0 % | Autonomia indefinida (ver `docs/spec.md`, secção 6) |

Contagens úteis para validar o ETL:
- Registos com F01 ou F02: **187** (37,4 %). Têm as duas: 12.
- Registos com `Current_Stock < Min_Required`: 43. Destes, 42 são elegíveis (`Min_Required ≤ Max_Capacity`) e 1 fica excluído pela F02.
- Registos com autonomia < tempo de reposição: 299 (59,8 %).

Estado esperado do rodapé de qualidade após o primeiro carregamento (só inventário): **500 lidos, 313 tratados (62,6 %), 187 assinalados (37,4 %), 0 rejeitados**. Total dos 5 ficheiros: **2003 lidos, 906 tratados (45,2 %), 1097 assinalados (54,8 %), 0 rejeitados** (inventário 187, patient 451, staff 459, vendor 0, financial 0).

## 3. `vendor_data.csv`

| Coluna | Tipo alvo | Valores |
|---|---|---|
| `Vendor_ID` | texto (PK) | V001, V002, V003 |
| `Vendor_Name` | texto | MedSupplies Inc., EquipMed Co., HealthTools Ltd. |
| `Item_Supplied` | texto | Surgical Mask, Ventilator, X-ray Machine |
| `Avg_Lead_Time (days)` → `avg_lead_time_days` | int | 5, 30, 15 |
| `Cost_Per_Item` | decimal | 0,5; 20 000; 5 000 |
| `Last_Order_Date` | date | 2024-09-28, 2024-09-01, 2024-09-15 |
| `Next_Delivery_Date` | date | 2024-10-03, 2024-10-15, 2024-10-05 |

Problemas:
- **Só 3 linhas.** Cada fornecedor tem um único artigo "fornecido", que não corresponde aos artigos que o inventário lhe atribui (o inventário atribui os 5 nomes a cada um dos 3 fornecedores).
- **Prazo declarado diverge das datas**: V001 declara 5 e as datas dão 5; V002 declara 30 e as datas dão **44**; V003 declara 15 e as datas dão **20**. Dias de `Next_Delivery_Date − Last_Order_Date`.
- **Referencial**: todos os `Vendor_ID` do inventário (V001, V002, V003) existem aqui.
- **Os três fornecedores são indistinguíveis pelo inventário**: `Restock_Lead_Time` médio de 15,6 (V001, desvio 8,5), 14,8 (V002, 8,8) e 14,9 (V003, 8,6) dias. O `Vendor_ID` parece atribuído ao acaso.

## 4. Ficheiros carregados sem KPI (perfil)

**`financial_data.csv`**: `Expense_Category` (Supplies 188, Staffing 167, Equipment 145) e `Description` (Surgeons' salaries 183, Surgical masks 172, Ventilators 145) são **independentes**: aparecem as 9 combinações possíveis (ex.: "Staffing — Surgical masks", "Equipment — Surgeons' salaries"). `Amount` de 1 110,27 a 49 581,16. Sem nulos.

**`patient_data.csv`**:
- Só outubro de 2024.
- Em **195 de 500 (39 %)** a alta é anterior à admissão.
- `Bed_Days` (1–14) não corresponde à diferença entre datas em 451 de 500 registos (diferença superior a 1 dia).
- `Supplies_Used` ("Gloves, IV"; "Gown, IV"; "Mask, Gown") e `Staff_Needed` ("1 Nurse, 1 Doctor"; …) contêm listas numa só célula (violam a 1NF).
- `Supplies_Used` e `Staff_Needed` são decompostos em tabelas ponte (1NF) no ETL.
- Sem serviço/departamento no inventário nem quantidades de consumo por doente: um heatmap serviço × artigo não é viável.

**`staff_data.csv`**:
- Só outubro de 2024; 393 de 500 turnos com horas extra; sem relação com artigos.
- `Shift_Start_Time` e `Shift_End_Time` ("08:00 AM", "06:00 PM", …) combinam-se ao acaso: durações calculadas de 0 h, 1 h, 22 h ou 23 h, e a duração calculada difere de `Hours_Worked` (8–11) em **459 de 500** turnos.
- `Shift_Date` traz hora do dia que não coincide com a hora de início do turno.
- `Overtime_Hours` (0–4) é independente de `Hours_Worked`.

## 5. Regras de conformidade

Ordem de aplicação no ETL. Ver o tratamento (rejeitar, assinalar, excluir de um KPI) na secção 4 de `docs/spec.md`. R01–R05 aplicam-se aos 5 ficheiros.

| Regra | Nível | Condição | Ocorrências atuais |
|---|---|---|---|
| R01 | Rejeitar | Linha ilegível (nº de colunas errado) | 0 |
| R02 | Rejeitar | Data inválida | 0 |
| R03 | Rejeitar | Número não interpretável | 0 |
| R04 | Rejeitar | Chave duplicada (data + artigo) | 0 |
| R05 | Rejeitar | `Vendor_ID` inexistente na dimensão de fornecedores | 0 |
| R10 | Assinalar | `Current_Stock > Max_Capacity` (F01) | 186 |
| R11 | Assinalar | `Min_Required > Max_Capacity` (F02) | 13 |
| R12 | Assinalar | Stock, custo, consumo ou tempo de reposição fora do domínio | 0 |
| R13 | Assinalar | `Item_Type` fora da lista | 0 |
| R20 | Assinalar | `patient_data`: alta anterior à admissão | 195 |
| R21 | Assinalar | `patient_data`: `Bed_Days` difere mais de 1 dia de (alta − admissão) | 451 (inclui os 195 de R20) |
| R22 | Assinalar | Lista não decomponível (`Supplies_Used`, `Staff_Needed`) | 0 |
| R30 | Assinalar | `staff_data`: duração do turno difere de `Hours_Worked` | 459 |
