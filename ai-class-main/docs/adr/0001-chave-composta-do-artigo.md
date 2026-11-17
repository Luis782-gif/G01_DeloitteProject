# O artigo é identificado pelo par (código, nome)

No inventário, o código do artigo não determina o nome (50 pares código × nome, para 10 códigos e 5 nomes), e o tipo, o fornecedor e o custo unitário variam por snapshot para o mesmo artigo. Decidimos que o artigo é a chave composta (código, nome), com a dimensão de artigos só com essas duas colunas; todos os atributos que variam ficam na tabela de factos do snapshot.

## Considered Options

- **Só o nome** (5 artigos): a classificação ABC em 3 níveis deixa de ter sentido.
- **Só o código** (10 artigos): agrupa nomes diferentes sob o mesmo código, de forma arbitrária.
- **Resolver atributos em conflito** (moda ou último valor) na dimensão: esconderia a inconsistência dos dados em vez de a mostrar.

## Consequences

- Cada artigo tem cerca de 10 observações (mínimo 5, máximo 21): base estatística fraca para variabilidade e sazonalidade, a assinalar como limitação.
- O slicer e o drill-down por tipo usam o tipo do snapshot, não um atributo estável do artigo.
