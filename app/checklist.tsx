import type { ChecklistResult, DriverChecklistAnswer, DriverChecklistItem } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from "react-native";

import { Button, Card, Field, SectionHeader, SheetScreen, StateView, Text } from "@/components/ui";
import { anexar, startChecklist, submitChecklist, transcrever } from "@/features/checklist/api";
import {
  prepararMicrofone,
  tipoDoAudio,
  useGravadorDeObservacao,
} from "@/features/checklist/recording";
import { useInvalidarVinculo } from "@/features/vehicle/hooks";
import { HIT_TARGET, theme, useColors, useThemedStyles, type Scheme } from "@/theme";

/** O que a tela guarda por item enquanto o motorista preenche. */
interface RespostaLocal extends DriverChecklistAnswer {
  /** Id do anexo já confirmado no servidor, e nunca a URL: ela vence. */
  attachmentId?: string;
  /** URI local, só para desenhar a miniatura enquanto a tela está aberta. */
  photoUri?: string;
}

type Respostas = Record<string, RespostaLocal>;

export default function ChecklistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const invalidarVinculo = useInvalidarVinculo();

  const [respostas, setRespostas] = useState<Respostas>({});
  const [odometro, setOdometro] = useState("");
  const [observacoes, setObservacoes] = useState("");

  /*
   * ⚠️ UMA CHAMADA, e não duas. `start` cria o rascunho E devolve o modelo: abrir o
   * formulário é uma ação só, e no 3G do pátio uma segunda ida à rede antes da
   * primeira pergunta é espera que o motorista sente. Tocar duas vezes em abrir
   * devolve o mesmo rascunho, então recarregar não duplica nada.
   */
  const rascunho = useQuery({
    queryKey: ["checklist-draft"],
    queryFn: startChecklist,
    retry: false,
  });

  const itens = useMemo(
    () => rascunho.data?.modelo.sections.flatMap((secao) => secao.items) ?? [],
    [rascunho.data],
  );

  const respondidos = itens.filter((item) => respostas[item.id]).length;
  const tudoRespondido = itens.length > 0 && respondidos === itens.length;

  /* As três pendências que impedem o envio, cada uma com o seu motivo na tela. */
  const semDescricao = itens.filter(
    (item) => respostas[item.id]?.result === "nao_conforme" && !respostas[item.id]?.note?.trim(),
  );
  const semFoto = itens.filter(
    (item) =>
      item.requiresPhotoOnFail &&
      respostas[item.id]?.result === "nao_conforme" &&
      !respostas[item.id]?.attachmentId,
  );
  const semOdometro = odometro.trim().length === 0;

  const enviar = useMutation({
    mutationFn: () =>
      submitChecklist({
        odometerKm: Number(odometro.replace(/\D/g, "")),
        notes: observacoes.trim() || undefined,
        /* A tela manda o seu vocabulário; a fronteira traduz para o do servidor. */
        answers: Object.values(respostas).map(({ itemId, result, note, noteSource }) => ({
          itemId,
          result,
          note: note?.trim() || undefined,
          noteSource,
        })),
      }),
    onSuccess: (recibo) => {
      void queryClient.invalidateQueries({ queryKey: ["driver-home"] });
      /* ⚠️ Item crítico reprovado TRAVA o caminhão, e o vínculo passa a refletir isso.
         Sem esta linha a home continuaria mostrando o veículo como se nada tivesse
         acontecido. */
      void invalidarVinculo();
      void queryClient.removeQueries({ queryKey: ["checklist-draft"] });

      /*
       * ⚠️ `veiculoTravado` vem do SERVIDOR, e a tela não deduz isso da lista de
       * críticos. A trava é uma escrita no banco, e dizer "seu caminhão está parado"
       * por inferência é a forma de um dia dizer isso errado.
       */
      Alert.alert(
        recibo.veiculoTravado ? "Caminhão parado" : "Checklist enviado",
        recibo.veiculoTravado
          ? `Reprovou em ${recibo.criticosReprovados.join(", ")}. ` +
              "O caminhão fica parado até a operação liberar. Procure a operação."
          : recibo.naoConformes > 0
            ? `Enviado com ${recibo.naoConformes} item(ns) em não conformidade.`
            : "Tudo conforme. Boa viagem.",
        [{ text: "Entendi", onPress: () => router.back() }],
      );
    },
    onError: (erro: Error) => Alert.alert("Não deu para enviar", erro.message),
  });

  function responder(itemId: string, patch: Partial<RespostaLocal>) {
    setRespostas((atual) => ({
      ...atual,
      [itemId]: { itemId, result: "conforme", ...atual[itemId], ...patch },
    }));
  }

  /**
   * ⚠️ Tira, SOBE e confirma, nesta ordem, e só então guarda o id.
   *
   * O arquivo vai direto para o object storage, e não passa pelo nosso servidor.
   * Guardar só a URI local e subir no envio faria o motorista descobrir uma falha de
   * upload no último toque, depois de preencher trinta e nove itens.
   */
  async function anexarFoto(itemId: string) {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert(
        "Câmera bloqueada",
        "Libere a câmera nas configurações do aparelho para anexar a foto do item reprovado.",
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    const foto = resultado.assets?.[0];
    if (resultado.canceled || !foto) return;

    responder(itemId, { photoUri: foto.uri, attachmentId: undefined });

    try {
      const id = await anexar(itemId, "photo", {
        uri: foto.uri,
        contentType: foto.mimeType ?? "image/jpeg",
        filename: foto.fileName ?? undefined,
      });
      responder(itemId, { attachmentId: id });
    } catch (erro) {
      /* A miniatura sai junto: foto que não subiu não é foto anexada, e deixá-la na
         tela faria o motorista achar que o item está resolvido. */
      responder(itemId, { photoUri: undefined });
      Alert.alert("A foto não subiu", (erro as Error).message);
    }
  }

  if (rascunho.isPending || rascunho.isError) {
    /*
     * ⚠️ Sem caminhão escaneado o servidor responde 409, e a tela oferece a câmera em
     * vez de repetir a chamada. O checklist é liberado pelo veículo identificado, e a
     * recusa é do servidor: aqui só se explica o que fazer.
     */
    const semVinculo = (rascunho.error as { status?: number } | null)?.status === 409;

    return (
      <SheetScreen scroll={false}>
        {semVinculo ? (
          <StateView
            empty="Escaneie o caminhão"
            emptyHint="O checklist é o do veículo que você vai dirigir. Leia o QR colado nele para liberar."
            emptyAction={{ label: "Abrir a câmera", onPress: () => router.push("/scanner") }}
          />
        ) : (
          <StateView
            loading={rascunho.isPending}
            error={rascunho.error}
            onRetry={() => void rascunho.refetch()}
            skeleton
          />
        )}
      </SheetScreen>
    );
  }

  const progresso = itens.length > 0 ? Math.round((respondidos / itens.length) * 100) : 0;
  const impedimentos = semDescricao.length + semFoto.length + (semOdometro ? 1 : 0);

  return (
    <SheetScreen>
      <Card style={styles.summary}>
        <View style={styles.summaryHead}>
          <View style={styles.summaryCopy}>
            <Text variant="titleMd">{rascunho.data.modelo.name}</Text>
            <Text variant="labelSm" tone="muted" tabular>
              v{rascunho.data.modelo.version} · {rascunho.data.placa}
            </Text>
          </View>
          <Text variant="metricMd" tone={tudoRespondido ? "success" : "default"}>
            {respondidos}/{itens.length}
          </Text>
        </View>

        <View style={styles.progressTrack} accessibilityLabel={`${progresso}% respondido`}>
          <View
            style={[
              styles.progressFill,
              { width: `${progresso}%` },
              tudoRespondido && styles.progressDone,
            ]}
          />
        </View>
      </Card>

      {rascunho.data.modelo.sections.map((secao) => (
        <View key={secao.title} style={styles.section}>
          <SectionHeader title={secao.title} />
          {secao.items.map((item) => (
            <LinhaDoChecklist
              key={item.id}
              item={item}
              resposta={respostas[item.id]}
              onResultado={(result) => responder(item.id, { result })}
              onObservacao={(note, noteSource) => responder(item.id, { note, noteSource })}
              onFoto={() => void anexarFoto(item.id)}
            />
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <SectionHeader title="Fechamento" />
        <Card style={styles.fechamento}>
          {/*
            O "KM" do cabeçalho da folha de papel. ⚠️ Pedido no FIM, e não na abertura:
            o motorista digita olhando para o painel, e exigir isso antes de mostrar a
            lista é uma porta fechada na frente do trabalho.
          */}
          <Field
            label="Quilometragem do painel"
            placeholder={
              rascunho.data.odometroDoVinculo
                ? String(rascunho.data.odometroDoVinculo)
                : "Ex.: 537495"
            }
            keyboardType="number-pad"
            value={odometro}
            onChangeText={(texto) => setOdometro(texto.replace(/\D/g, ""))}
          />
          {/* As observações gerais do rodapé da folha. */}
          <Field
            label="Observações gerais"
            placeholder="Algo que a operação precisa saber?"
            multiline
            value={observacoes}
            onChangeText={setObservacoes}
          />
        </Card>
      </View>

      {impedimentos > 0 && tudoRespondido ? (
        <Card style={styles.blocker}>
          <View style={styles.blockerHead}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text variant="titleMd" tone="error">
              Falta pouco
            </Text>
          </View>
          <View style={styles.blockerList} accessibilityRole="alert">
            {semOdometro ? (
              <Text variant="bodyMd" tone="variant">
                Informe a quilometragem do painel.
              </Text>
            ) : null}
            {semDescricao.length > 0 ? (
              <Text variant="bodyMd" tone="variant">
                Descreva o que encontrou em: {semDescricao.map((i) => i.label).join(", ")}.
              </Text>
            ) : null}
            {semFoto.length > 0 ? (
              <Text variant="bodyMd" tone="variant">
                Anexe a foto de: {semFoto.map((i) => i.label).join(", ")}.
              </Text>
            ) : null}
          </View>
        </Card>
      ) : null}

      <Button
        label="Enviar checklist"
        loading={enviar.isPending}
        disabled={!tudoRespondido || impedimentos > 0}
        onPress={() => enviar.mutate()}
      />
      {!tudoRespondido ? (
        <Text variant="labelSm" tone="muted" style={styles.hint}>
          Faltam {itens.length - respondidos} de {itens.length} itens.
        </Text>
      ) : null}
    </SheetScreen>
  );
}

/* -------------------------------------------------------------------------- */

interface LinhaProps {
  item: DriverChecklistItem;
  resposta?: RespostaLocal;
  onResultado: (result: ChecklistResult) => void;
  onObservacao: (note: string, noteSource: "typed" | "dictated") => void;
  onFoto: () => void;
}

function LinhaDoChecklist({ item, resposta, onResultado, onObservacao, onFoto }: LinhaProps) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const reprovado = resposta?.result === "nao_conforme";

  return (
    <Card
      style={[
        styles.item,
        reprovado && styles.itemFailed,
        resposta?.result === "conforme" && styles.itemPassed,
      ]}
    >
      <View style={styles.itemCopy}>
        <Text variant="titleMd">{item.label}</Text>
        {item.hint ? (
          <Text variant="labelSm" tone="muted">
            {item.hint}
          </Text>
        ) : null}
        {item.blocking ? (
          <Text variant="labelSm" tone="error">
            Reprovar para o caminhão
          </Text>
        ) : null}
      </View>

      {/*
        ⚠️ TRÊS ESCOLHAS, que é a legenda da folha de papel: C, NC e NA.
        Sem o "não aplica", o motorista de um caminhão sem cones marca "conforme"
        neles, porque é a única saída que a tela oferece, e resposta de enfeite ensina
        a responder sem olhar. Cada alvo tem 48pt, para mão de luva.
      */}
      <View style={styles.escolhas}>
        <Escolha
          icone="checkmark"
          texto="Conforme"
          rotulo={`${item.label}: conforme`}
          ativo={resposta?.result === "conforme"}
          cor={colors.success}
          onPress={() => onResultado("conforme")}
        />
        <Escolha
          icone="close"
          texto="Não conforme"
          rotulo={`${item.label}: não conforme`}
          ativo={reprovado}
          cor={colors.error}
          onPress={() => onResultado("nao_conforme")}
        />
        <Escolha
          icone="remove"
          texto="Não aplica"
          rotulo={`${item.label}: não se aplica a este veículo`}
          ativo={resposta?.result === "nao_aplica"}
          cor={colors.onSurfaceMuted}
          onPress={() => onResultado("nao_aplica")}
        />
      </View>

      {reprovado ? (
        <View style={styles.reprovado}>
          <CampoDeObservacao
            valor={resposta?.note ?? ""}
            origem={resposta?.noteSource}
            onTexto={(texto) => onObservacao(texto, "typed")}
            onDitado={(texto) => onObservacao(texto, "dictated")}
          />

          {item.requiresPhotoOnFail ? (
            resposta?.photoUri ? (
              <View style={styles.photoRow}>
                <Image source={{ uri: resposta.photoUri }} style={styles.photo} />
                {resposta.attachmentId ? (
                  <Text variant="labelSm" tone="success">
                    Foto enviada
                  </Text>
                ) : (
                  <View style={styles.enviando}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text variant="labelSm" tone="muted">
                      Enviando…
                    </Text>
                  </View>
                )}
                <Button label="Trocar" variant="ghost" onPress={onFoto} />
              </View>
            ) : (
              <Button label="Anexar foto" variant="ghost" onPress={onFoto} />
            )
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * A observação do item: teclado E microfone, sempre os dois.
 *
 * <h2>⚠️ O TECLADO NUNCA SAI DA TELA</h2>
 *
 * O microfone existe porque boa parte dos motoristas não escreve, e digitar no
 * celular é a barreira real deste campo. Mas a transcrição responde 503 em três
 * casos previstos (sem provedor, teto mensal do mês atingido, falha do provedor), e
 * nos três a única saída é digitar. Uma tela que trocasse o campo pelo botão
 * deixaria o motorista sem forma nenhuma de descrever o defeito, e item crítico sem
 * descrição não pode ser enviado: ele ficaria preso no pátio.
 *
 * ⚠️ O texto transcrito aparece no campo para ele CONFERIR antes de enviar. Ler não
 * é a barreira; escrever é.
 */
function CampoDeObservacao({
  valor,
  origem,
  onTexto,
  onDitado,
}: {
  valor: string;
  origem?: "typed" | "dictated";
  onTexto: (texto: string) => void;
  onDitado: (texto: string) => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { gravador, gravando } = useGravadorDeObservacao();
  const [transcrevendo, setTranscrevendo] = useState(false);

  /**
   * ⚠️ TUDO dentro de um try, e todo erro vira um aviso na tela.
   *
   * Sem isso, qualquer falha (microfone recusado pelo navegador, `MediaRecorder`
   * que não aceita o formato, rede caída) vira uma promessa rejeitada em silêncio:
   * o motorista aperta o botão, nada acontece, e não há o que ele possa fazer nem
   * o que investigar depois. Falha de ditado precisa dizer "escreva no campo".
   */
  async function alternarGravacao() {
    try {
      if (gravando) {
        await gravador.stop();
        const uri = gravador.uri;
        if (!uri) {
          Alert.alert("Nada foi gravado", "Tente de novo, ou escreva no campo.");
          return;
        }

        setTranscrevendo(true);
        /*
         * ⚠️ O tipo vem do BLOB, e não do que a plataforma prometeu gravar. O
         * navegador escolhe o codec que tem: pedir `audio/webm` e receber
         * `audio/ogg` é normal, e mandar o tipo errado ao servidor faz a
         * transcrição voltar vazia sem erro em lugar nenhum.
         */
        const { text } = await transcrever({ uri, contentType: tipoDoAudio() });
        if (text.trim()) onDitado(text.trim());
        else Alert.alert("Não entendi", "Fale de novo, mais perto, ou escreva no campo.");
        return;
      }

      if (!(await prepararMicrofone())) {
        Alert.alert(
          "Microfone bloqueado",
          "Libere o microfone nas configurações do aparelho, ou escreva a observação.",
        );
        return;
      }

      await gravador.prepareToRecordAsync();
      gravador.record();
    } catch (erro) {
      /* ⚠️ Nunca some com o campo de texto: a saída é sempre digitar. */
      Alert.alert("Ditado indisponível", `${(erro as Error).message} Escreva no campo abaixo.`);
    } finally {
      setTranscrevendo(false);
    }
  }

  return (
    <View style={styles.observacao}>
      <View style={styles.observacaoCampo}>
        <Field
          label="O que você encontrou?"
          placeholder="Ex.: com folga no pedal"
          multiline
          value={valor}
          onChangeText={onTexto}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={gravando ? "Parar de gravar" : "Ditar a observação"}
        accessibilityState={{ busy: transcrevendo }}
        onPress={() => void alternarGravacao()}
        disabled={transcrevendo}
        style={[
          styles.microfone,
          gravando && { borderColor: colors.error, backgroundColor: `${colors.error}1F` },
        ]}
      >
        {transcrevendo ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons
            name={gravando ? "stop" : "mic"}
            size={22}
            color={gravando ? colors.error : colors.accent}
          />
        )}
      </Pressable>

      {/* ⚠️ Dizer que está gravando, em texto: o ícone sozinho não avisa quem não
          está olhando para ele, e gravação que o motorista não sabe que começou é
          gravação que ele não termina. */}
      {gravando ? (
        <Text variant="labelSm" tone="error" style={styles.origem}>
          Gravando… toque de novo para parar.
        </Text>
      ) : origem === "dictated" ? (
        <Text variant="labelSm" tone="muted" style={styles.origem}>
          Ditado. Confira antes de enviar.
        </Text>
      ) : null}
    </View>
  );
}

function Escolha({
  icone,
  texto,
  rotulo,
  ativo,
  cor,
  onPress,
}: {
  icone: "checkmark" | "close" | "remove";
  texto: string;
  rotulo: string;
  ativo: boolean;
  cor: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={[styles.escolha, ativo && { backgroundColor: `${cor}1F`, borderColor: cor }]}
    >
      <Ionicons name={icone} size={22} color={ativo ? cor : colors.onSurfaceMuted} />
      {/*
        ⚠️ O rótulo é escrito, e não só ícone. "Não aplica" não tem ícone que se
        entenda sozinho, e o motorista lê: a barreira dele é escrever.
      */}
      <Text variant="labelSm" tone={ativo ? "default" : "muted"}>
        {texto}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Scheme) =>
  StyleSheet.create({
    summary: { gap: theme.space.md },
    summaryHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.space.md,
    },
    summaryCopy: { flex: 1, gap: 2 },
    progressTrack: {
      height: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: colors.surfaceSunken,
      overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: colors.accentSolid },
    progressDone: { backgroundColor: colors.success },
    section: { gap: theme.space.md },
    item: { gap: theme.space.md },
    itemFailed: { borderColor: colors.error },
    itemPassed: { borderColor: colors.success },
    itemCopy: { gap: 2 },
    escolhas: { flexDirection: "row", gap: theme.space.sm },
    escolha: {
      flex: 1,
      minHeight: HIT_TARGET,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      paddingVertical: theme.space.sm,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outlineStrong,
      backgroundColor: colors.surfaceSunken,
    },
    reprovado: { gap: theme.space.md },
    observacao: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.space.sm,
      flexWrap: "wrap",
    },
    observacaoCampo: { flex: 1, minWidth: 180 },
    microfone: {
      width: HIT_TARGET,
      height: HIT_TARGET,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outlineStrong,
      backgroundColor: colors.surfaceSunken,
    },
    origem: { width: "100%" },
    enviando: { flexDirection: "row", alignItems: "center", gap: theme.space.xs },
    photoRow: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
    photo: { width: 64, height: 64, borderRadius: theme.radius.md },
    fechamento: { gap: theme.space.md },
    blocker: { gap: theme.space.sm, borderColor: colors.error },
    blockerHead: { flexDirection: "row", alignItems: "center", gap: theme.space.sm },
    blockerList: { gap: theme.space.xs },
    hint: { textAlign: "center" },
  });
