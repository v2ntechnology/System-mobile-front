import { brandGradient, radius } from "./tokens";

/*
 * CONTRATO DE DIREÇÃO — app do motorista RookHub
 *
 * THESIS: a tela do motorista tem duas superfícies: o cabeçalho, que diz quem
 * ele é e o que a operação exige agora, e a folha que sobe por cima e carrega o
 * trabalho e os números. Recusa a tela plana onde bloqueio, viagem e rodapé
 * pesam igual.
 * OWN-WORLD: dois esquemas com os mesmos papéis, e as mesmas âncoras do painel
 * de gestão: grafite #212121 no escuro, papel morno #F4F2EF no claro, terracota
 * #D5623A para ação e marinho para estado ativo. A folha sempre contrasta com o
 * cabeçalho; card com borda de 1px, Sora nos títulos, Inter no corpo, número
 * sempre tabular.
 * STORY: abriu, se reconhece no cabeçalho, entende a recompensa do período e
 * enxerga a rota que está dirigindo; desceu, encontra ações e explicações.
 * FIRST VIEWPORT: saudação e veículo no cabeçalho, premiação ligada ao score e
 * início do mapa da jornada. Bloqueio crítico continua acima de tudo.
 * FORM: cockpit operacional inspirado em referências de logística pinadas pelo
 * usuário; mapa e tarefa dominam, sem copiar marca, paleta ou ornamento.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 * finish review, the verdict, and docs/DESIGN.md.
 */
/**
 * Estrutura do tema: o que **não** muda entre claro e escuro.
 *
 * Cor não mora aqui. Ela vem de `useTheme()` (`./provider`), porque depende do
 * esquema em uso — e um `theme.colors` estático voltaria a congelar a tela em um
 * único modo sem ninguém perceber.
 */

/**
 * Famílias, uma por peso.
 *
 * Em React Native o peso não é sintetizado a partir de um arquivo: no Android,
 * `fontWeight` sobre uma família já específica é ignorado e o texto volta ao
 * Regular. Por isso cada degrau da escala nomeia o arquivo do seu peso e nenhum
 * estilo abaixo declara `fontWeight`.
 *
 * O par é o mesmo do painel de gestão: **Sora** escreve título, e **Inter**
 * escreve tudo o que se lê de fato. Sora é geométrica e de caixa larga, ótima
 * em duas ou três palavras e cansativa em parágrafo.
 *
 * ⚠️ MÉTRICA CONTINUA NA INTER, de propósito. O valor operacional é o conteúdo
 * mais lido da tela e sai tabular (`fontVariant: tabular-nums`), e é a Inter que
 * tem essa figura desenhada. Número em Sora salta de largura a cada dígito e faz
 * a coluna dançar quando a jornada atualiza.
 */
const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  displayMedium: "Sora_500Medium",
  displaySemibold: "Sora_600SemiBold",
  displayBold: "Sora_700Bold",
} as const;

export const theme = {
  radius,
  brandGradient,
  fonts,

  /** Escala de espaçamento em múltiplos de 4, igual à do Tailwind. */
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
    "3xl": 48,
  },

  /**
   * Escala de produto: razão curta (~1,15) e muitos degraus, porque a tela tem
   * mais rótulo e número do que prosa. `metric*` existe separado do corpo porque
   * valor operacional é conteúdo, não decoração, e sempre sai tabular.
   *
   * Os três degraus de cima são Sora e o resto é Inter. A entrelinha deles subiu
   * dois pontos junto com a troca: a Sora tem altura-x maior que a Inter e o
   * título de duas linhas encostava.
   */
  text: {
    displayLg: { fontSize: 40, lineHeight: 48, fontFamily: fonts.displayBold, letterSpacing: -1.2 },
    headlineLg: {
      fontSize: 30,
      lineHeight: 39,
      fontFamily: fonts.displayBold,
      letterSpacing: -0.8,
    },
    headlineMd: {
      fontSize: 23,
      lineHeight: 31,
      fontFamily: fonts.displaySemibold,
      letterSpacing: -0.5,
    },
    titleMd: { fontSize: 17, lineHeight: 23, fontFamily: fonts.semibold, letterSpacing: -0.2 },
    metricLg: { fontSize: 26, lineHeight: 32, fontFamily: fonts.bold, letterSpacing: -0.6 },
    metricMd: { fontSize: 19, lineHeight: 25, fontFamily: fonts.bold, letterSpacing: -0.3 },
    bodyLg: { fontSize: 17, lineHeight: 26, fontFamily: fonts.regular },
    bodyMd: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
    labelMd: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium },
    labelSm: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium },
    /** Rótulo de seção e de métrica: caixa alta curta, nunca frase. */
    overline: { fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold, letterSpacing: 0.9 },
  },
} as const;

/**
 * Alvo mínimo de toque. Caminhoneiro usa o app em pé, no pátio, muitas vezes de
 * luva — 44pt é o piso da Apple/WCAG e aqui é regra, não sugestão.
 */
export const HIT_TARGET = 48;

/**
 * Raio da folha que sobe sobre o cabeçalho, e o quanto ela avança por cima dele.
 * Os dois andam juntos: mudar um sem o outro desfaz a costura.
 */
export const SHEET_RADIUS = 24;
export const SHEET_OVERLAP = 20;

export {
  ForceScheme,
  ThemeProvider,
  useColors,
  useScreenScheme,
  useTheme,
  useThemedStyles,
  type SchemeName,
} from "./provider";
export { useThemeMode, useThemeStore, type ThemeMode } from "./store";
export { brandGradient, type Scheme } from "./tokens";
