# Mosaicos: grelha CSS com ordem e largura, sem biblioteca de drag-and-drop

O dashboard editável (spec 8.7) precisa de arrastar, reordenar e redimensionar mosaicos, com layouts guardados por perfil, e de uma alternativa por teclado ao rato. Decidimos **não adicionar biblioteca**: o layout é uma lista ordenada de `{ id, position, w, h }` (largura 1-12 colunas, altura 1-8 unidades) desenhada com CSS Grid de 12 colunas; o arrastar usa a API nativa de drag-and-drop HTML5 e o teclado usa botões por mosaico (Subir/Descer, +/− Largura, +/− Altura) com anúncio numa região `aria-live` e foco devolvido ao botão usado.

## Considered Options

- **`react-grid-layout`**: posicionamento livre em x/y com redimensionamento por rato; mas não tem alternativa de teclado, o modelo x/y é mais pesado do que precisamos (os blocos fluem por ordem de leitura) e o suporte a React 19 não foi verificado neste projeto.
- **`@dnd-kit/*`**: sensor de teclado e anúncios acessíveis; o redimensionamento teria de ser escrito à mão de qualquer forma, e acrescenta dependências cujo suporte a React 19 / Next 16 teria de ser validado.
- **Grelha CSS + HTML5 DnD + botões (escolhida)**: sem dependências novas nem risco de compatibilidade; a ordem do DOM é a ordem visual (boa para leitores de ecrã); toda a lógica (mover, redimensionar, reconciliar) são funções puras testáveis sem browser.

## Consequences

- O redimensionar com o rato não existe: redimensiona-se por passos com botões (o que também serve o teclado). O HTML5 DnD não funciona em ecrãs táteis; aí valem os botões.
- Os Server Components continuam a ser desenhados no servidor; o invólucro `TileGrid` é de cliente e recebe os blocos já desenhados por composição.
- Se mais tarde for preciso posicionamento livre ou arrastar tátil, trocar o `TileGridView` por `@dnd-kit` mantém o modelo e a API.
