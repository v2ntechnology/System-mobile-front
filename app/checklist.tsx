import type { DriverChecklistAnswer, DriverChecklistItem } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";

import { Button, Card, Field, SectionHeader, SheetScreen, StateView, Text } from "@/components/ui";
import { getTemplate, submitChecklist } from "@/features/checklist/api";
import { getHome } from "@/features/journey/api";
import { useCurrentBinding, useInvalidarVinculo } from "@/features/vehicle/hooks";
import { HIT_TARGET, theme, useColors, useThemedStyles, type Scheme } from "@/theme";

type Answers = Record<string, DriverChecklistAnswer>;

export default function ChecklistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [answers, setAnswers] = useState<Answers>({});

  /*
   * ⚠️ O VÍNCULO VEM PRIMEIRO, e o template depende dele.
   *
   * Sem caminhão escaneado não existe checklist para pedir: o servidor responde 409,
   * e pedir mesmo assim só produziria um erro que a tela teria de explicar. O
   * `enabled` é o que faz a tela perguntar na ordem certa.
   */
  const { data: vinculo, isPending: vinculoPendente } = useCurrentBinding();
  const invalidarVinculo = useInvalidarVinculo();

  const template = useQuery({
    queryKey: ["checklist-template", vinculo?.veiculo.id],
    queryFn: getTemplate,
    enabled: Boolean(vinculo),
  });
  const home = useQuery({ queryKey: ["driver-home"], queryFn: getHome });

  const items = useMemo(
    () => template.data?.sections.flatMap((section) => section.items) ?? [],
    [template.data],
  );

  const missingPhoto = items.filter(
    (item) =>
      item.requiresPhotoOnFail &&
      answers[item.id]?.result === "REPROVADO" &&
      !answers[item.id]?.photoUri,
  );
  const answered = items.filter((item) => answers[item.id]).length;
  const answeredAll = items.length > 0 && answered === items.length;

  const submit = useMutation({
    mutationFn: () =>
      submitChecklist({
        templateId: template.data!.id,
        templateVersion: template.data!.version,
        plate: vinculo?.veiculo.plate ?? "",
        tripId: home.data?.currentTrip?.id,
        // RN-054 — relógio do aparelho; o servidor carimba o dele na chegada.
        filledAt: new Date().toISOString(),
        answers: Object.values(answers),
      }),
    onSuccess: (receipt) => {
      void queryClient.invalidateQueries({ queryKey: ["driver-home"] });
      /* ⚠️ Item crítico reprovado TRAVA o caminhão, e o vínculo passa a refletir
         isso. Sem esta linha a home continuaria mostrando o veículo como se nada
         tivesse acontecido. */
      void invalidarVinculo();
      Alert.alert(
        receipt.result === "APROVADO" ? "Checklist aprovado" : "Checklist enviado",
        receipt.message,
        [{ text: "Entendi", onPress: () => router.back() }],
      );
    },
    onError: (error: Error) => Alert.alert("Não deu para enviar", error.message),
  });

  function setAnswer(itemId: string, patch: Partial<DriverChecklistAnswer>) {
    setAnswers((current) => ({
      ...current,
      [itemId]: { itemId, result: "APROVADO", ...current[itemId], ...patch },
    }));
  }

  async function attachPhoto(itemId: string) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Câmera bloqueada",
        "Libere a câmera nas configurações do aparelho para anexar a foto do item reprovado.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) setAnswer(itemId, { photoUri: asset.uri });
  }

  /*
   * ⚠️ SEM VÍNCULO A TELA NÃO MONTA O FORMULÁRIO, e isso não é decoração: é o fluxo.
   * O checklist é liberado pelo caminhão identificado, e a recusa é do servidor. A
   * tela só explica o que fazer e oferece a câmera.
   */
  if (!vinculoPendente && !vinculo) {
    return (
      <SheetScreen scroll={false}>
        <StateView
          empty="Escaneie o caminhão"
          emptyHint="O checklist é o do veículo que você vai dirigir. Leia o QR colado nele para liberar."
          emptyAction={{ label: "Abrir a câmera", onPress: () => router.push("/scanner") }}
        />
      </SheetScreen>
    );
  }

  if (vinculoPendente || template.isPending || template.isError) {
    return (
      <SheetScreen scroll={false}>
        <StateView
          loading={vinculoPendente || template.isPending}
          error={template.error}
          onRetry={() => void template.refetch()}
          skeleton
        />
      </SheetScreen>
    );
  }

  const progress = items.length > 0 ? Math.round((answered / items.length) * 100) : 0;

  return (
    <SheetScreen>
      <Card style={styles.summary}>
        <View style={styles.summaryHead}>
          <View style={styles.summaryCopy}>
            <Text variant="titleMd">{template.data.name}</Text>
            <Text variant="labelSm" tone="muted" tabular>
              v{template.data.version} · {vinculo?.veiculo.plate ?? "—"}
            </Text>
          </View>
          <Text variant="metricMd" tone={answeredAll ? "success" : "default"}>
            {answered}/{items.length}
          </Text>
        </View>

        <View style={styles.progressTrack} accessibilityLabel={`${progress}% respondido`}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` },
              answeredAll && styles.progressDone,
            ]}
          />
        </View>
      </Card>

      {template.data.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <SectionHeader title={section.title} />
          {section.items.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              answer={answers[item.id]}
              onResult={(result) => setAnswer(item.id, { result })}
              onNote={(note) => setAnswer(item.id, { note })}
              onPhoto={() => void attachPhoto(item.id)}
            />
          ))}
        </View>
      ))}

      {missingPhoto.length > 0 ? (
        <Card style={styles.blocker}>
          <View style={styles.blockerHead}>
            <Ionicons name="camera" size={20} color={colors.error} />
            <Text variant="titleMd" tone="error">
              Falta foto
            </Text>
          </View>
          {/* RN-040 — reprovação sem foto não serve para a manutenção decidir nada. */}
          <Text variant="bodyMd" tone="variant" accessibilityRole="alert">
            Anexe a foto de: {missingPhoto.map((item) => item.label).join(", ")}.
          </Text>
        </Card>
      ) : null}

      <Button
        label="Enviar checklist"
        loading={submit.isPending}
        disabled={!answeredAll || missingPhoto.length > 0}
        onPress={() => submit.mutate()}
      />
      {!answeredAll ? (
        <Text variant="labelSm" tone="muted" style={styles.hint}>
          Faltam {items.length - answered} de {items.length} itens.
        </Text>
      ) : null}
    </SheetScreen>
  );
}

interface RowProps {
  item: DriverChecklistItem;
  answer?: DriverChecklistAnswer;
  onResult: (result: "APROVADO" | "REPROVADO") => void;
  onNote: (note: string) => void;
  onPhoto: () => void;
}

function ChecklistRow({ item, answer, onResult, onNote, onPhoto }: RowProps) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const failed = answer?.result === "REPROVADO";
  const passed = answer?.result === "APROVADO";

  return (
    <Card style={[styles.item, failed && styles.itemFailed, passed && styles.itemPassed]}>
      <View style={styles.itemHead}>
        <View style={styles.itemLabel}>
          <Text variant="titleMd">{item.label}</Text>
          {item.hint ? (
            <Text variant="labelSm" tone="muted">
              {item.hint}
            </Text>
          ) : null}
          {item.blocking ? (
            <Text variant="labelSm" tone="error">
              Reprovar bloqueia a saída
            </Text>
          ) : null}
        </View>

        {/* Dois alvos grandes, lado a lado: decisão de uma mão só, de luva. */}
        <View style={styles.choices}>
          <Choice
            icon="checkmark"
            label={`Aprovar ${item.label}`}
            active={passed}
            activeColor={colors.success}
            onPress={() => onResult("APROVADO")}
          />
          <Choice
            icon="close"
            label={`Reprovar ${item.label}`}
            active={failed}
            activeColor={colors.error}
            onPress={() => onResult("REPROVADO")}
          />
        </View>
      </View>

      {failed ? (
        <View style={styles.failure}>
          <Field
            label="Observação"
            placeholder="O que está errado?"
            multiline
            value={answer?.note ?? ""}
            onChangeText={onNote}
          />
          {item.requiresPhotoOnFail ? (
            answer?.photoUri ? (
              <View style={styles.photoRow}>
                <Image source={{ uri: answer.photoUri }} style={styles.photo} />
                <Button label="Trocar foto" variant="ghost" onPress={onPhoto} />
              </View>
            ) : (
              <Button label="Anexar foto" variant="ghost" onPress={onPhoto} />
            )
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Choice({
  icon,
  label,
  active,
  activeColor,
  onPress,
}: {
  icon: "checkmark" | "close";
  label: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.choice,
        active && { backgroundColor: `${activeColor}1F`, borderColor: activeColor },
      ]}
    >
      <Ionicons name={icon} size={24} color={active ? activeColor : colors.onSurfaceMuted} />
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
    itemHead: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
    itemLabel: { flex: 1, gap: 2 },
    choices: { flexDirection: "row", gap: theme.space.sm },
    choice: {
      width: HIT_TARGET,
      height: HIT_TARGET,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outlineStrong,
      backgroundColor: colors.surfaceSunken,
    },
    failure: { gap: theme.space.md },
    photoRow: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
    photo: { width: 64, height: 64, borderRadius: theme.radius.md },
    blocker: { gap: theme.space.sm, borderColor: colors.error },
    blockerHead: { flexDirection: "row", alignItems: "center", gap: theme.space.sm },
    hint: { textAlign: "center" },
  });
