import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Text } from "@/components/ui";
import { bindByQr, tomadaPendente } from "@/features/vehicle/api";
import { useInvalidarVinculo } from "@/features/vehicle/hooks";
import { formatRelative } from "@/lib/format";
import { HIT_TARGET, theme, useColors, useThemedStyles, type Scheme } from "@/theme";
import type { VehicleTakeover } from "@/types";

/** O que o adesivo carrega. Qualquer outro QR do pátio é descartado sem ir à rede. */
const PREFIXO = "rookhub:v1:veiculo:";

/**
 * A câmera que lê o adesivo do caminhão.
 *
 * ⚠️ **O campo de digitar não é acessório.** Câmera suja, lente riscada, permissão
 * negada e aparelho velho acontecem no pátio, e nenhum deles pode impedir o motorista
 * de sair. O código vai impresso por extenso no adesivo exatamente para isso.
 */
export default function Scanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const invalidarVinculo = useInvalidarVinculo();

  const [permissao, pedirPermissao] = useCameraPermissions();
  const [erro, setErro] = useState<string | null>(null);
  const [tomada, setTomada] = useState<VehicleTakeover | null>(null);
  const [digitando, setDigitando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);

  /*
   * ⚠️ `useRef`, e não estado: `onBarcodeScanned` dispara a cada quadro enquanto o
   * QR estiver enquadrado, e estado só atualiza no próximo render. Com `useState` a
   * mesma leitura vira dezenas de POST antes de a tela reagir.
   */
  const lendo = useRef(false);

  async function assumir(lido: string, confirmTakeover = false) {
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await bindByQr(lido, { confirmTakeover });
      await invalidarVinculo();
      router.back();
    } catch (falha) {
      const ocupado = tomadaPendente(falha);
      if (ocupado) {
        /* Não é erro: é a pergunta. A folha de confirmação se monta com o corpo do 409. */
        setTomada(ocupado);
        setCodigo(lido);
      } else {
        setErro(
          falha instanceof Error ? falha.message : "Não foi possível ler o adesivo. Tente de novo.",
        );
        lendo.current = false;
      }
    } finally {
      setEnviando(false);
    }
  }

  function aoLer(valor: string) {
    /* QR de nota fiscal, lacre e etiqueta de fornecedor é descartado em silêncio:
       avisar a cada um deles transformaria o pátio inteiro em mensagem de erro. */
    if (lendo.current || !valor.startsWith(PREFIXO)) return;
    lendo.current = true;
    void assumir(valor);
  }

  /* A permissão ainda não foi resolvida: não decidir nada, para a tela não piscar. */
  if (!permissao) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      {permissao.granted && !digitando ? (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => aoLer(data)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Mira. Só desenho: o leitor enxerga o quadro inteiro, e restringir a área
          só faria o motorista precisar de pontaria com o celular na chuva. */}
      {permissao.granted && !digitando ? (
        <View pointerEvents="none" style={styles.mira}>
          <View style={styles.miraQuadro} />
        </View>
      ) : null}

      <View style={[styles.topo, { paddingTop: insets.top + theme.space.md }]}>
        <Pressable
          accessibilityLabel="Fechar"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.fechar}
        >
          <Ionicons color={colors.onSurface} name="close" size={24} />
        </Pressable>
        <Text variant="titleMd" style={styles.titulo}>
          {digitando ? "Digitar o código" : "Escaneie o adesivo"}
        </Text>
      </View>

      <View style={[styles.base, { paddingBottom: insets.bottom + theme.space.xl }]}>
        {tomada ? (
          <View accessibilityRole="alert" style={styles.folha}>
            <Text variant="titleMd">Caminhão ocupado</Text>
            <Text tone="variant" variant="bodyMd">
              {/* Tempo relativo, e não horário: o motorista decide com "está com ele
                  há 3 h", e não precisa calcular a diferença de um horário cheio. */}
              O {tomada.placa} está com {tomada.motoristaAtual}
              {tomada.desde ? ` ${formatRelative(tomada.desde)}` : ""}.
            </Text>
            <Text tone="muted" variant="labelSm">
              Assumir encerra o turno dele neste caminhão, e a operação vê os dois registros.
            </Text>
            <Button
              label="Assumir mesmo assim"
              loading={enviando}
              onPress={() => void assumir(codigo, true)}
              shape="pill"
            />
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setTomada(null);
                lendo.current = false;
              }}
              style={styles.secundario}
            >
              <Text tone="muted" variant="labelMd">
                Cancelar
              </Text>
            </Pressable>
          </View>
        ) : digitando ? (
          <View style={styles.folha}>
            <Text tone="variant" variant="bodyMd">
              O código está impresso embaixo do QR, no adesivo do caminhão.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onChangeText={setCodigo}
              onSubmitEditing={() => void assumir(codigo)}
              placeholder="código do adesivo"
              placeholderTextColor={colors.onSurfaceFaint}
              returnKeyType="go"
              style={styles.campo}
              value={codigo}
            />
            {erro ? (
              <Text tone="error" variant="labelMd">
                {erro}
              </Text>
            ) : null}
            <Button
              disabled={codigo.trim().length === 0}
              label="Assumir o caminhão"
              loading={enviando}
              onPress={() => void assumir(codigo)}
              shape="pill"
            />
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setDigitando(false);
                setErro(null);
                lendo.current = false;
              }}
              style={styles.secundario}
            >
              <Text tone="muted" variant="labelMd">
                Voltar para a câmera
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.folha}>
            {!permissao.granted ? (
              <>
                <Text variant="titleMd">Câmera bloqueada</Text>
                <Text tone="variant" variant="bodyMd">
                  Para ler o adesivo o app precisa da câmera. Você também pode digitar o código.
                </Text>
                <Button
                  label="Permitir a câmera"
                  onPress={() => void pedirPermissao()}
                  shape="pill"
                />
              </>
            ) : (
              <Text tone="variant" variant="bodyMd" style={styles.dica}>
                Aponte para o QR colado no caminhão.
              </Text>
            )}

            {erro ? (
              <Text tone="error" variant="labelMd" style={styles.dica}>
                {erro}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setDigitando(true);
                setErro(null);
              }}
              style={styles.secundario}
            >
              <Text tone="accent" variant="labelMd">
                Digitar o código do adesivo
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Scheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    topo: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      paddingHorizontal: theme.space.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.md,
    },
    fechar: {
      width: HIT_TARGET,
      height: HIT_TARGET,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      backgroundColor: colors.surface,
    },
    titulo: { flex: 1 },
    mira: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
    miraQuadro: {
      width: "70%",
      aspectRatio: 1,
      borderWidth: 3,
      borderColor: colors.accentSolid,
      borderRadius: theme.radius.xl,
    },
    base: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.space.lg,
    },
    folha: {
      gap: theme.space.md,
      padding: theme.space.lg,
      borderRadius: theme.radius.xl,
      backgroundColor: colors.sheet,
    },
    dica: { textAlign: "center" },
    campo: {
      minHeight: 54,
      paddingHorizontal: theme.space.lg,
      borderRadius: theme.radius.pill,
      backgroundColor: colors.surfaceSunken,
      color: colors.onSurface,
      fontFamily: theme.fonts.regular,
      fontSize: 17,
    },
    secundario: { minHeight: HIT_TARGET, alignItems: "center", justifyContent: "center" },
  });
