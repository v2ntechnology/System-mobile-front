import Svg, { Path } from "react-native-svg";

import { useColors } from "@/theme";

interface Props {
  height?: number;
  color?: string;
}

/**
 * Só o símbolo, monocromático, para espaço apertado: avatar, aba, cabeçalho
 * compacto. Onde a marca **se apresenta** (login, boot) quem entra é o
 * `RookhubLogo`, que traz a palavra e o destaque em terracota junto.
 */
export function RookhubMark({ height = 44, color }: Props) {
  const colors = useColors();
  /* Sem cor explícita o símbolo herda o texto da superfície em que está. Era o
     branco do gradiente, e não serve mais: o símbolo saiu do login em 22/09/2026
     e o que sobrou são usos sobre card. */
  const fill = color ?? colors.onSurface;

  return (
    <Svg
      accessibilityLabel="RookHub"
      accessibilityRole="image"
      height={height}
      viewBox="0 0 59 90"
      width={(height * 59) / 90}
    >
      <Path
        d="M37.4769 18.2749H1.52171C1.52171 18.2749 -0.241347 18.6734 3.53465 27.4123C7.31065 36.1512 16.399 39.0687 20.4711 39.4352H57.2593C57.5447 38.0841 57.1859 33.7879 53.4669 27.4123C49.748 21.0367 41.2574 18.6642 37.4769 18.2749Z"
        fill={fill}
      />
      <Path
        d="M23.7388 70.6628V42.3692C23.7388 42.3692 23.3128 40.9818 13.9676 43.9532C4.62237 46.9247 1.50243 54.0763 1.1106 57.2807L1.1106 86.2298C2.55547 86.4545 7.14968 86.172 13.9676 83.2455C20.7854 80.3189 23.3225 73.6376 23.7388 70.6628Z"
        fill={fill}
      />
      <Path
        d="M48.3572 59.5969L29.4846 64.6022C29.4846 64.6022 28.4838 64.5692 28.8127 57.9368C29.1414 51.3044 33.3598 48.0005 35.428 47.1776L54.7378 42.0564C55.1433 42.9609 55.7676 46.013 55.0216 50.9859C54.2757 55.9589 50.2679 58.7987 48.3572 59.5969Z"
        fill={fill}
      />
      <Path
        d="M35.8284 84.8794L54.701 89.8846C54.701 89.8846 55.7018 89.8516 55.3731 83.2193C55.0442 76.5869 50.8258 73.283 48.7576 72.4601L29.4478 67.3389C29.0424 68.2434 28.4181 71.2954 29.164 76.2684C29.9099 81.2413 33.9178 84.0812 35.8284 84.8794Z"
        fill={fill}
      />
      <Path
        d="M5.02901 0H2.77647C1.24307 0 0 1.23036 0 2.74809V12.916C0 14.4338 1.24307 15.6641 2.77647 15.6641H34.7059C36.2393 15.6641 37.4824 14.4338 37.4824 12.916V2.74809C37.4824 1.23036 36.2393 0 34.7059 0H32.2781C30.9928 0 29.9509 1.03133 29.9509 2.30355C29.9509 3.57576 28.9089 4.60709 27.6235 4.60709H26.4982C25.2129 4.60709 24.1708 3.57576 24.1708 2.30355C24.1708 1.03133 23.1288 0 21.8435 0H16.1643C14.879 0 13.8369 1.03133 13.8369 2.30355C13.8369 3.57576 12.795 4.60709 11.5096 4.60709H9.68369C8.39834 4.60709 7.35636 3.57576 7.35636 2.30355C7.35636 1.03133 6.31436 0 5.02901 0Z"
        fill={fill}
      />
    </Svg>
  );
}
