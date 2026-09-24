/* Import por subcaminho, não pelo índice do pacote: o índice arrasta as 18
   variantes da Inter (~6 MB) para dentro do bundle. Aqui entram só os pesos que
   a escala do tema usa, de cada uma das duas famílias. */
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Sora_500Medium } from "@expo-google-fonts/sora/500Medium";
import { Sora_600SemiBold } from "@expo-google-fonts/sora/600SemiBold";
import { Sora_700Bold } from "@expo-google-fonts/sora/700Bold";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BootScreen } from "@/components/boot-screen";
import { DevicePreview } from "@/components/device-preview";
import { theme, ThemeProvider, useTheme } from "@/theme";

/**
 * Rede de campo é ruim e cara. Cache longo e sem refetch ao focar: o motorista
 * troca de app o tempo todo (mapa, telefone), e revalidar a cada volta gastaria
 * dado dele por nada — o que precisa estar fresco tem `refetch` explícito.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/* A splash segura a tela até o JavaScript montar. Daí em diante quem espera é a
   `BootScreen`, que mostra a mesma marca com um indicador girando — a imagem
   parada do sistema não distingue "carregando" de "travado". */
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [client] = useState(() => queryClient);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  useEffect(() => {
    /* Entregar a espera para a BootScreen assim que houver React na tela. */
    void SplashScreen.hideAsync();
  }, []);

  /* Falha de fonte não trava o app: o sistema resolve e a tela abre mesmo assim. */
  if (!fontsLoaded && !fontError) {
    return (
      <ThemeProvider>
        <DevicePreview>
          <BootScreen />
        </DevicePreview>
      </ThemeProvider>
    );
  }

  /* O provider fica por fora da moldura: é assim que o preview sabe qual esquema
     a tela está mostrando e pinta o notch e o indicador junto com ela. */
  return (
    <ThemeProvider>
      <DevicePreview>
        <QueryClientProvider client={client}>
          <SafeAreaProvider>
            <RootNavigator />
          </SafeAreaProvider>
        </QueryClientProvider>
      </DevicePreview>
    </ThemeProvider>
  );
}

/** Precisa ser filho do provider: header e fundo do Stack são cor de esquema. */
function RootNavigator() {
  const { colors } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={colors.statusBar} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.onSurface,
            headerTitleStyle: { fontSize: 17, fontFamily: theme.fonts.semibold },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          {/* Sem header: não há para onde voltar. A sessão existe e não serve para
              nada até a senha provisória ser trocada, e a saída é "entrar com outra
              conta", que a própria tela oferece. */}
          <Stack.Screen name="primeiro-acesso" options={{ headerShown: false }} />
          {/* Só repassa os parâmetros do deep link para o login. Nunca é vista. */}
          <Stack.Screen name="acesso" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Tela cheia, sem header: a câmera é a tela, e o botão de fechar é dela. */}
          <Stack.Screen
            name="scanner"
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
          {/* Nome da rota em inglês, título em pt-BR: o caminho é código, o texto é interface. */}
          <Stack.Screen name="checklist" options={{ title: "Checklist pré-viagem" }} />
          <Stack.Screen name="fuel-entry" options={{ title: "Novo abastecimento" }} />
          <Stack.Screen name="trip/[id]" options={{ title: "Viagem" }} />
        </Stack>
      </View>
    </GestureHandlerRootView>
  );
}
