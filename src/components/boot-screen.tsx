import { ActivityIndicator, StyleSheet, View } from "react-native";

import { RookhubLogo } from "@/components/brand/rookhub-logo";
import { theme, useColors } from "@/theme";

/**
 * O que fica na tela enquanto o app termina de subir.
 *
 * O splash do sistema é uma imagem parada: no recarregar do Expo, ou numa rede
 * de pátio, ela fica encarando o motorista sem dizer se ainda está viva. Aqui a
 * marca continua, mas com um indicador girando — a mesma tela no Android, no iOS
 * e no preview.
 *
 * Sem texto de propósito: esta tela aparece antes de a Inter e a Sora estarem em
 * memória, e qualquer palavra aqui refluiria assim que a fonte trocasse. A
 * palavra "RookHub" que aparece é desenho vetorial dentro do logo, não texto, e
 * por isso não depende de fonte nenhuma.
 */
export function BootScreen() {
  const colors = useColors();

  return (
    <View
      accessibilityLabel="Carregando o RookHub"
      accessibilityRole="progressbar"
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <RookhubLogo height={44} />
      <ActivityIndicator color={colors.accent} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space["2xl"],
  },
});
