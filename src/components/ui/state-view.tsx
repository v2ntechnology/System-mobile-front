import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";

import { theme, useColors } from "@/theme";

import { Button } from "./button";
import { Text } from "./text";

interface Props {
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Vazio legítimo — sem viagem, sem abastecimento. Não é erro. */
  empty?: string;
  /** Uma linha dizendo o que fazer para o vazio deixar de existir. */
  emptyHint?: string;
  /**
   * O botão que RESOLVE o vazio.
   *
   * ⚠️ Diferente do `onRetry`, que só repete a mesma chamada. Aqui o vazio é
   * legítimo e tem uma saída concreta: sem caminhão escaneado, a saída é abrir a
   * câmera. Dizer "escaneie o caminhão" sem o botão manda o motorista procurar
   * sozinho onde fica o scanner, de luva, no pátio.
   */
  emptyAction?: { label: string; onPress: () => void };
  /** Carregamento de lista: blocos no lugar do conteúdo, não roda no meio da tela. */
  skeleton?: boolean;
}

/**
 * Carregando / erro / vazio numa peça só.
 *
 * O erro do mock já chega no formato RFC 9457 (`ApiError`), então o texto vem
 * do `detail` do servidor quando existe — mensagem genérica é a exceção, não a
 * regra, e em campo o motorista precisa saber se tenta de novo ou liga.
 */
export function StateView({
  loading,
  error,
  onRetry,
  empty,
  emptyHint,
  emptyAction,
  skeleton = false,
}: Props) {
  const colors = useColors();

  if (loading) {
    if (skeleton) return <SkeletonList />;
    return (
      <View style={styles.box}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    const detail = error instanceof Error ? error.message : "Não foi possível carregar os dados.";
    return (
      <View style={styles.box}>
        <Text variant="titleMd" style={styles.center}>
          Não deu para carregar
        </Text>
        <Text tone="variant" style={styles.center}>
          {detail}
        </Text>
        {onRetry ? <Button label="Tentar de novo" variant="ghost" onPress={onRetry} /> : null}
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.box}>
        <Text variant="titleMd" style={styles.center}>
          {empty}
        </Text>
        {emptyHint ? (
          <Text variant="labelMd" tone="muted" style={styles.center}>
            {emptyHint}
          </Text>
        ) : null}
        {emptyAction ? (
          <Button label={emptyAction.label} onPress={emptyAction.onPress} shape="pill" />
        ) : null}
      </View>
    );
  }

  return null;
}

/** Três blocos no formato do card que vem depois — o olho já sabe onde olhar. */
function SkeletonList() {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.skeleton} accessibilityLabel="Carregando" accessibilityRole="progressbar">
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[styles.block, { backgroundColor: colors.surface, opacity: pulse }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.md,
    paddingVertical: theme.space["2xl"],
  },
  center: { textAlign: "center" },
  skeleton: { gap: theme.space.md },
  block: { height: 108, borderRadius: theme.radius.lg },
});
