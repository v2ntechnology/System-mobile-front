/**
 * Tokens de cor e raio da marca RookHub, em dois esquemas.
 *
 * React Native não tem CSS, então aqui o valor mora em TypeScript e é consumido
 * pelo `useTheme()` (nunca importando este arquivo direto na tela).
 *
 * Os dois esquemas têm **exatamente as mesmas chaves**: é isso que permite um
 * componente escrever `colors.surface` sem saber em que modo está rodando. Papel
 * primeiro, cor depois; nenhum token se chama pelo que ele parece.
 *
 * ÂNCORAS DE PRODUTO, iguais às do painel de gestão (`System-web`, arquivo
 * `src/styles/palette.css`):
 *
 *   #212121  Grafite    fundo do tema escuro, nos dois produtos
 *   #D5623A  Terracota  marca primária
 *   #010066  Marinho    marca secundária
 *   #F4F2EF  Papel      chão do tema claro
 *
 * ⚠️ A SECUNDÁRIA TROCA DE VALOR ENTRE OS TEMAS, e a primária não. A terracota
 * tem luminância média e sobrevive nos dois fundos, então é o mesmo hex no
 * grafite e no papel. O marinho não: ele dá 15,6:1 sobre o papel e 1,07:1 sobre
 * o grafite, onde some por completo. Por isso o esquema escuro traz a versão
 * clara da mesma matiz (#A0A6FF, 7,2:1 sobre o grafite) e o claro traz o
 * #010066. A referência é o Itaú: laranja é a cor da ação, azul escuro é a cor
 * do link e do detalhe.
 *
 * ⚠️ O CUSTO DE CONTRASTE DA TERRACOTA É REAL, E É HERDADO DO PAINEL. Um único
 * laranja, sem escala de apoio, por decisão do usuário em 08/09/2026. O #D5623A
 * dá 4,3:1 sobre o grafite e 3,9:1 com texto branco por cima: passa o AA de 3:1
 * de componente e de texto grande, e reprova o AA de 4,5:1 que texto de corpo
 * pede. Por isso a terracota aqui é **ação, ícone e rótulo curto**, e nunca
 * corpo de texto. Quem carrega leitura longa é a família `onSurface*`.
 *
 * ⚠️ **Espelho manual.** A mesma paleta existe como custom properties CSS no
 * painel de gestão e no site institucional (`Website`). Nenhum dos três se
 * atualiza sozinho: mexeu na paleta aqui, espelhe lá.
 */

export interface Scheme {
  /** Fundo da tela e do cabeçalho. */
  background: string;
  /** Pill, avatar e campo dentro do cabeçalho. */
  heroSurface: string;
  /** Folha de conteúdo que sobe sobre o cabeçalho. */
  sheet: string;
  /** Card sobre a folha. */
  surface: string;
  /** Poço: campo de formulário, trilho de progresso. */
  surfaceSunken: string;

  onSurface: string;
  onSurfaceVariant: string;
  onSurfaceMuted: string;
  /**
   * Cinza mais leve que o `muted`, para o texto que é dica e não conteúdo:
   * placeholder de campo. Fica abaixo de AA de propósito, o rótulo do campo
   * continua acima dele, legível, e é ele que carrega a informação.
   */
  onSurfaceFaint: string;

  /** Borda de card e divisor de linha. */
  outline: string;
  /** Contorno que precisa ser visto: botão fantasma, item selecionável. */
  outlineStrong: string;

  /** Terracota legível como ícone e rótulo curto neste esquema. */
  accent: string;
  /** Terracota de preenchimento: botão, pill ativa, barra de progresso. */
  accentSolid: string;
  onAccentSolid: string;
  /** Fundo suave da terracota: estado ativo que não pode gritar. */
  accentSoft: string;
  /** Marinho de estado ativo e foco. Troca de valor entre os temas. */
  secondary: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;

  /** Ícones da barra de status sobre o fundo deste esquema. */
  statusBar: "light" | "dark";
}

/**
 * Escuro de grafite, a mesma rampa neutra do painel de gestão.
 *
 * ⚠️ Era o preto #0A0A0A de "cabine noturna", e virou o grafite em 22/09/2026,
 * a pedido do usuário: o app do motorista e o painel abrem lado a lado na mesma
 * operação, e duas rampas neutras diferentes liam como dois produtos. O grafite
 * é a âncora do ecossistema, então quem se move é este lado.
 *
 * As camadas sobem em direção ao conteúdo e são as mesmas do painel: o chão é o
 * `--color-surface`, a folha é o `--color-surface-low`, o card é o
 * `--color-surface-container`, o poço é o `--color-surface-lowest`. A borda de
 * 1px termina de separar o que a luminância sozinha não separaria.
 *
 * A rampa neutra é cinza puro de propósito: o azul-noite que a versão anterior
 * usava puxava a tela inteira para o roxo e não casava com o grafite.
 */
export const darkScheme: Scheme = {
  background: "#212121",
  heroSurface: "#383838",
  sheet: "#262626",
  surface: "#2E2E2E",
  surfaceSunken: "#171717",

  onSurface: "#F0F0F2",
  onSurfaceVariant: "#B4B4BC",
  onSurfaceMuted: "#9A9AA4",
  onSurfaceFaint: "#8A8A94",

  outline: "#3A3A3E",
  outlineStrong: "#6E6E76",

  accent: "#D5623A",
  accentSolid: "#D5623A",
  onAccentSolid: "#FFFFFF",
  /* Terracota rebaixada até virar superfície: separa do card #2E2E2E pelo calor,
     não pela luminância, e não compete com o botão cheio ao lado. */
  accentSoft: "#3D2118",
  /* Versão clara do marinho, a única que sobrevive ao grafite. */
  secondary: "#A0A6FF",

  success: "#34D399",
  successSoft: "#0E3226",
  warning: "#FBBF24",
  warningSoft: "#3A2A08",
  error: "#FB7185",
  errorSoft: "#451826",
  info: "#38BDF8",
  infoSoft: "#0C3450",

  statusBar: "light",
};

/**
 * Claro de papel morno, o mesmo do painel: cabeçalho branco, folha de papel e
 * card branco por cima dela. Contraste alto porque a tela é lida sob sol direto.
 *
 * ⚠️ O cinza azulado saiu junto com o preto. O papel morno (#F4F2EF) tem um grão
 * de amarelo no neutro, e a razão é física: a tela fica aberta o turno inteiro
 * sob luz fria, onde o cinza neutro lê como monitor apagado. O papel separa a
 * folha do branco do card sem precisar de traço.
 *
 * As semânticas aqui são a família `*-on-light` do painel, e não a cheia: neste
 * esquema elas são quase sempre **texto e ícone** sobre superfície clara, e o
 * tom cheio reprovaria o AA de 4,5:1 que essa leitura exige.
 */
export const lightScheme: Scheme = {
  background: "#FFFFFF",
  heroSurface: "#EAE7E2",
  sheet: "#F4F2EF",
  surface: "#FFFFFF",
  surfaceSunken: "#EAE7E2",

  onSurface: "#191817",
  onSurfaceVariant: "#4A4741",
  onSurfaceMuted: "#6B665E",
  onSurfaceFaint: "#857F75",

  outline: "#E5E1DB",
  outlineStrong: "#A8A29A",

  accent: "#D5623A",
  accentSolid: "#D5623A",
  onAccentSolid: "#FFFFFF",
  accentSoft: "#FAEDE7",
  /* O marinho cheio: 15,6:1 sobre o papel, aguenta ser link, texto e fundo. */
  secondary: "#010066",

  success: "#065F46",
  successSoft: "#E4F1EB",
  warning: "#6B3F0A",
  warningSoft: "#F7EEE0",
  error: "#9F1239",
  errorSoft: "#FBE9EE",
  info: "#075985",
  infoSoft: "#E4EFF7",

  statusBar: "dark",
};

/**
 * Gradiente de marca, nas paradas em ordem. Igual nos dois esquemas.
 *
 * ⚠️ Substituiu o `spectrumStops`, que ia do magenta ao ciano e era do desenho
 * anterior à unificação com o painel. Aquele arco não existe mais na marca.
 *
 * Aqui o arco é a própria terracota, clareando no topo e fechando embaixo: o
 * painel decidiu em 08/09/2026 que o produto tem um laranja só, então um
 * gradiente que atravessasse até o marinho passaria por um marrom arroxeado que
 * não é cor de marca nenhuma. O que sobra é profundidade dentro da matiz, que é
 * o suficiente para o fundo do login e do cartão de premiação não serem chapados.
 */
export const brandGradient = ["#E88A5C", "#D5623A", "#A34523"] as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
} as const;

export type ColorToken = keyof Scheme;
