# Design

Sistema visual do app do motorista RookHub, como ele está construído hoje.
Fonte da verdade dos valores: [`src/theme/tokens.ts`](../src/theme/tokens.ts). Nenhum valor de cor
mora em tela, e nenhum componente sabe em que modo está rodando.

## A ideia

A tela tem **duas superfícies**. O cabeçalho diz quem é o motorista e o que a operação exige dele;
a folha sobe por cima e carrega o trabalho e os números. A costura entre as duas é o que dá
profundidade — não sombra sobre card.

A estrutura vem de [`design-reference/`](design-reference/), o protótipo web pinado
pelo usuário — material de leitura, não código mantido aqui.

## Cockpit do motorista

A home combina duas referências de logística escolhidas pelo usuário: tarefa atual e score bem
hierarquizados, mais o mapa como contexto operacional. A RookHub preserva a própria paleta e usa
esta ordem:

1. bloqueio crítico, quando existir;
2. premiação estimada e o próximo objetivo de score;
3. rota atual, posição, velocidade, previsão e ação da viagem;
4. acessos rápidos e resumo do mês;
5. próximas viagens e avisos de documento.

A premiação não é calculada na tela. `DriverReward` traz nome do programa, fechamento e faixas
parametrizadas pela empresa; o componente apenas explica em qual faixa o motorista está e quantos
pontos faltam para a próxima.

A rota tem uma implementação só,
[`route-map-canvas.tsx`](../src/features/journey/components/route-map-canvas.tsx): malha de tiles
raster com o percurso desenhado por cima em SVG, na mesma projeção Web Mercator dos tiles. Vale para
Android, iOS e preview — o computador mostra o mesmo mapa que sai no aparelho, inclusive o basemap
que troca de claro para escuro junto com o tema.

O Perfil começa pelo desempenho e responde três perguntas, nesta ordem: qual é a nota, como ela é
calculada e o que fazer para melhorar. Evento mostra quantidade, impacto em pontos e orientação —
cor nunca é a única explicação.

## Dois esquemas, os mesmos papéis

Claro e escuro definem **exatamente as mesmas chaves**; é isso que deixa um componente escrever
`colors.surface` sem condicional. Papel primeiro, cor depois.

| Papel            | Escuro    | Claro     | Onde                               |
| ---------------- | --------- | --------- | ---------------------------------- |
| `background`     | `#212121` | `#FFFFFF` | tela, cabeçalho, barra de abas     |
| `heroSurface`    | `#383838` | `#EAE7E2` | pill e avatar dentro do cabeçalho  |
| `sheet`          | `#262626` | `#F4F2EF` | folha de conteúdo, raio 24 no topo |
| `surface`        | `#2E2E2E` | `#FFFFFF` | card sobre a folha                 |
| `surfaceSunken`  | `#171717` | `#EAE7E2` | campo, trilho de progresso         |
| `onSurface`      | `#F0F0F2` | `#191817` | texto principal                    |
| `onSurfaceFaint` | `#8A8A94` | `#857F75` | placeholder de campo (login)       |
| `outline`        | `#3A3A3E` | `#E5E1DB` | borda de card, divisor de linha    |
| `accent`         | `#D5623A` | `#D5623A` | ícone e rótulo curto de acento     |
| `accentSolid`    | `#D5623A` | `#D5623A` | botão, FAB, pill ativa, progresso  |
| `secondary`      | `#A0A6FF` | `#010066` | estado ativo e foco                |

No escuro a folha é mais clara que o cabeçalho; no claro é mais escura. Nos dois casos ela lê como
uma peça sobre a outra. Card e folha se separam pela borda de 1px, não pelo fundo: dois tons
vizinhos brigam sob sol, uma linha não.

**As âncoras são as do ecossistema RookHub**, as mesmas de `src/styles/palette.css` no painel de
gestão: grafite `#212121` no escuro, papel morno `#F4F2EF` no claro, terracota `#D5623A` como
primária e marinho `#010066` como secundária. Em 22/09/2026 o app deixou de ter paleta própria: o
preto de cabine e o par indigo/ciano eram do desenho anterior à unificação, e duas rampas neutras
diferentes faziam o app e o painel lerem como dois produtos na mesma operação.

**A primária não troca entre os temas, e a secundária troca.** A terracota tem luminância média e
sobrevive nos dois fundos, então é o mesmo hex nos dois. O marinho dá 15,6:1 sobre o papel e 1,07:1
sobre o grafite, onde some por completo: por isso o escuro traz a versão clara da mesma matiz
(`#A0A6FF`, 7,2:1) e o claro traz o `#010066`. Laranja é a cor da ação, azul escuro é a do estado
ativo e do detalhe.

**A terracota é ação, ícone e rótulo curto, nunca corpo de texto.** O painel decidiu por um laranja
único, sem escala de apoio, e o custo de contraste veio junto: `#D5623A` dá 4,3:1 sobre o grafite e
3,9:1 com branco por cima. Isso passa o AA de 3:1 de componente e de texto grande, e reprova o AA de
4,5:1 de texto de corpo. Quem carrega leitura longa é a família `onSurface*`, e cor nunca é a única
explicação de um estado.

O papel morno do claro tem um grão de amarelo no neutro, e a razão é física: a tela fica aberta o
turno inteiro sob luz fria, onde o cinza neutro lê como monitor apagado. O papel separa a folha do
branco do card sem precisar de traço. As semânticas do claro são a família `*-on-light` do painel, e
não o tom cheio: neste esquema elas são quase sempre texto e ícone sobre superfície clara.

No escuro, a rampa é cinza puro de propósito, e o que a luminância não separa a borda de 1px separa.
Sobre o card, texto principal fica em 12,6:1, o apagado em 4,9:1, e cada par de estado (sucesso,
alerta, erro, informação) passa de 5:1 sobre o próprio fundo suave.

O login usa o gradiente de marca (`brandGradient`): a própria terracota, clareando no topo e
fechando embaixo. Não atravessa até o marinho porque o caminho entre as duas passa por um marrom
arroxeado que não é cor de marca nenhuma.

## Como o esquema é escolhido

`ThemeProvider` resolve em um lugar só: preferência salva no Perfil ganha do aparelho, e
`ForceScheme` ganha dos dois. A preferência (`system` / `light` / `dark`) fica em
[`src/theme/store.ts`](../src/theme/store.ts), persistida no aparelho.

A tela de **login é sempre clara**, via `ForceScheme`. É a única tela que alguém de fora da
operação vê, e ela não muda de cara conforme o aparelho de quem abriu.

Componente com cor escreve `useThemedStyles(makeStyles)`, com a fábrica definida fora do
componente. `StyleSheet.create` no topo do arquivo só para o que não tem cor.

## Tipografia

Duas famílias, as mesmas do painel de gestão: **Sora** escreve título e **Inter** escreve tudo o que
se lê de fato. Sete pesos ao todo, carregados por subcaminho em
[`app/_layout.tsx`](../app/_layout.tsx). Cada degrau nomeia o arquivo do seu peso e nenhum estilo
declara `fontWeight` — no Android o peso não é sintetizado sobre uma família já específica.

Sora é geométrica e de caixa larga: ótima em duas ou três palavras, cansativa em parágrafo. Por isso
ela fica só nos três degraus de cima, e a entrelinha deles é dois pontos maior que a da versão
anterior, porque a altura-x da Sora é maior que a da Inter e o título de duas linhas encostava.

**Métrica continua na Inter, de propósito.** O valor operacional é o conteúdo mais lido da tela e sai
tabular, e é a Inter que tem essa figura desenhada. Número em Sora salta de largura a cada dígito e
faz a coluna dançar quando a jornada atualiza.

| Degrau        | Tamanho/linha   | Uso                                      |
| ------------- | --------------- | ---------------------------------------- |
| `displayLg`   | 40/48 Sora bold | score de segurança                       |
| `headlineLg`  | 30/39 Sora bold | título de tela cheia                     |
| `headlineMd`  | 23/31 Sora semi | título do cabeçalho, destino em destaque |
| `titleMd`     | 17/23 semi      | título de card e de seção                |
| `metricLg/Md` | 26/32, 19/25    | valor operacional (R$, km, km/l, %)      |
| `bodyLg/Md`   | 17/26, 15/22    | texto corrido                            |
| `labelMd/Sm`  | 13/18, 12/16    | rótulo, meta, prazo                      |
| `overline`    | 11/14 semi      | rótulo de métrica e de campo, caixa alta |

`metric*` e `displayLg` saem tabulares sem ninguém pedir: número que muda de largura mente ao olho.

## Componentes

Todos em [`src/components/ui/`](../src/components/ui/). Nenhuma tela desenha sua própria casca.

- **`SheetScreen`** — casca de duas superfícies. `hero` desenha o cabeçalho; sem ele (telas do
  Stack) fica só a faixa que revela o raio da folha. `insetBottom={false}` nas abas, onde a barra
  inferior já reserva o safe area.
- **`HeroBar`** — título, contexto de uma linha e um elemento à direita.
- **`MetricStrip`** — três números do período em uma peça dividida por fios, não três cartões.
- **`SectionHeader`** — título, descrição opcional e contagem em pill. Sem rótulo acima do título.
- **`Card` / `HeroCard`** — card da folha e card do cabeçalho.
- **`FilterPills`** — filtro que sangra até a borda; terracota cheia marca a seleção.
- **`Chip`** — estado semântico; cada tom tem texto e fundo suave próprios do esquema.
- **`Field`** — poço: o campo é a superfície recuada dentro do card.
- **`RewardCard`** (feature performance) — estimativa, ranking, próxima faixa e regras do período.
- **`ScoreRing` / `ScoreBreakdown` / `ScoreTrend`** — número, composição ponderada e evolução do
  score; todo gráfico também escreve o valor.
- **`Button`** — `primary` e `ghost`, altura mínima 48.
- **FAB** (tela Abastecer) — a ação principal de uma tela de lista flutua no canto, 60pt, e abre a
  tela de preenchimento. Formulário longo não mora dentro de aba de consulta.
- **`ThemePicker`** — Sistema / Claro / Escuro, no Perfil.
- **`StateView`** — carregando (esqueleto na altura do card que vem), erro com recuperação, vazio
  que ensina o que fazer.
- **`RouteLine`** (feature journey) — origem vazada, trecho, destino cheio. A viagem lida antes do
  texto.
- **`RouteMapCard`** (feature journey) — mapa, status, ETA, progresso e abertura da navegação.

## Regras que não se negociam

1. Alvo de toque 48pt em qualquer controle de campo.
2. Valor operacional é conteúdo: tem degrau próprio e sai tabular.
3. Cor vem de `useColors()` / `useThemedStyles`, nunca de um objeto estático de tema.
4. Estado nunca é só cor: atraso vem com a palavra, aba ativa vem com pill, item reprovado vem com
   borda e ícone.
5. Sem blur por item de lista: derruba FPS em lista longa.
6. Sem `fontWeight` junto de `fontFamily`.
7. Sem hex literal fora de `tokens.ts`; opacidade se escreve como sufixo do token
   (`` `${colors.accent}3D` ``).

## Movimento

Só estado: pulso do esqueleto de carregamento e o `pressed` dos controles. Não há sequência de
entrada — o motorista abre o app dentro de uma tarefa, não para assistir à tela montar.
