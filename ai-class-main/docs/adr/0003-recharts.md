# recharts como biblioteca de gráficos

A spec pede dispersão, barras, linhas e Pareto (barras + linha acumulada) com eixos, tooltips e uma linha de referência (a diagonal de folga zero). Decidimos usar `recharts` (3.x, validado com React 19 e Next 16) em componentes de cliente (`'use client'`); os dados vêm sempre da API, o gráfico só desenha.

## Considered Options

- **Gráficos SVG à mão**: controlo total, mas eixos, tooltips e acessibilidade teriam de ser reescritos em cada gráfico.
- **Chart.js / ECharts**: canvas, mais difícil de testar e de tornar acessível; menos naturais em React.
- **Nivo / Visx**: mais pesados ou de mais baixo nível para o ganho que temos.

## Consequences

- Os gráficos são componentes de cliente; os Server Components buscam os dados e passam-nos por props.
- Cores vêm dos tokens do tema (`theme/tokens.ts`), nunca só cor: estado também por forma/texto.
- Nos testes de frontend (`tsx --test`, sem browser) testam-se as funções de preparação de dados; o desenho é verificado no browser.
