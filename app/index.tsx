import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useHydrated, useSession } from "@/features/auth/store";
import { useColors } from "@/theme";

/**
 * Porta de entrada.
 *
 * Espera o keychain responder antes de decidir — mandar para o login e voltar
 * meio segundo depois é a diferença entre "abriu logado" e "me deslogou de novo".
 * Guarda de rota aqui é conveniência: a autorização real é do backend (regra 10).
 *
 * ⚠️ O desvio de senha provisória é decidido AQUI, e por um campo da sessão, sem
 * nenhuma chamada de API antes. Enquanto `mustChangePassword` for verdadeiro o
 * servidor responde 403 em toda rota menos trocar senha, ver a sessão, renovar e
 * sair: pedir a home primeiro devolveria um 403 vindo de dentro da agregação, e a
 * tela mostraria erro genérico no lugar do caminho de saída.
 */
export default function Index() {
  const hydrated = useHydrated();
  const session = useSession();
  const colors = useColors();

  if (!hydrated) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  if (session.mustChangePassword) return <Redirect href="/primeiro-acesso" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center" },
});
