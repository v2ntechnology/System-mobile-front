import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Button,
  Card,
  HeroBar,
  MetricStrip,
  SectionHeader,
  SheetScreen,
  StateView,
  Text,
} from "@/components/ui";
import { useSession } from "@/features/auth/store";
import { advanceTrip, getHome } from "@/features/journey/api";
import { RouteMapCard } from "@/features/journey/components/route-map-card";
import { TripCard } from "@/features/journey/components/trip-card";
import { RewardCard } from "@/features/performance/components/reward-card";
import { useCurrentBinding } from "@/features/vehicle/hooks";
import { daysUntil, formatDate, formatKm, formatLongDate } from "@/lib/format";
import { TRIP_STATUS } from "@/lib/trip-status";
import { HIT_TARGET, theme, useColors, useThemedStyles, type Scheme } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function HomeScreen() {
  const router = useRouter();
  const session = useSession();
  const queryClient = useQueryClient();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [actionError, setActionError] = useState<string | null>(null);

  /* O caminhão de agora. Sem ele a tela não tem checklist para oferecer. */
  const { data: vinculo } = useCurrentBinding();

  const home = useQuery({ queryKey: ["driver-home"], queryFn: getHome });

  const advance = useMutation({
    mutationFn: (tripId: string) => advanceTrip(tripId),
    onMutate: () => setActionError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-home"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
    },
    /* O mesmo aviso fica dentro do app no Expo e no preview web. */
    onError: (error: Error) => setActionError(error.message),
  });

  if (home.isPending || home.isError) {
    return (
      <SheetScreen scroll={false} insetBottom={false} hero={<HeroBar title="Início" />}>
        <StateView
          loading={home.isPending}
          error={home.error}
          onRetry={() => void home.refetch()}
          skeleton
        />
      </SheetScreen>
    );
  }

  const data = home.data;
  const driver = data.driver;
  const firstName = (session?.user.name ?? driver.name).split(" ")[0];
  const cnhDays = daysUntil(data.cnhExpiresAt);
  const action = data.currentTrip ? TRIP_STATUS[data.currentTrip.status].action : undefined;

  return (
    <SheetScreen
      insetBottom={false}
      refreshing={home.isFetching}
      onRefresh={() => void home.refetch()}
      hero={
        <HeroBar
          title={`${greeting()}, ${firstName}`}
          subtitle={`${formatLongDate(new Date())}${vinculo ? ` · ${vinculo.veiculo.plate}` : ""}`}
          trailing={
            <Pressable
              accessibilityLabel="Abrir perfil"
              accessibilityRole="button"
              onPress={() => router.push("/profile")}
              style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
            >
              <Ionicons color={colors.secondary} name="person-outline" size={21} />
            </Pressable>
          }
        />
      }
    >
      {/*
        ⚠️ SEM VÍNCULO, ESTE É O PRIMEIRO CARTÃO DA TELA, acima do bloqueio e da
        premiação. Sem caminhão identificado não há checklist para liberar e não há
        jornada para começar: qualquer outra coisa no topo seria o app pedindo que o
        motorista resolva o que ainda não pode.
      */}
      {!vinculo ? (
        <Card style={styles.semVinculo}>
          <View style={styles.alertHead}>
            <View style={[styles.alertIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="qr-code-outline" size={21} color={colors.accent} />
            </View>
            <View style={styles.alertCopy}>
              <Text variant="titleMd">Escaneie o caminhão</Text>
              <Text variant="labelMd" tone="variant">
                Leia o QR colado no veículo que você vai dirigir hoje. É o que libera o checklist.
              </Text>
            </View>
          </View>
          <Button label="Abrir a câmera" onPress={() => router.push("/scanner")} shape="pill" />
        </Card>
      ) : null}

      {/* Bloqueio de segurança sempre precede conteúdo financeiro e operacional. */}
      {data.blockedByChecklist ? (
        <Card style={styles.alertCritical}>
          <View style={styles.alertHead}>
            <View style={[styles.alertIcon, { backgroundColor: colors.errorSoft }]}>
              <Ionicons name="warning" size={21} color={colors.error} />
            </View>
            <View style={styles.alertCopy}>
              <Text variant="titleMd" tone="error">
                Veículo bloqueado
              </Text>
              <Text variant="labelMd" tone="variant">
                Um item crítico falhou. Aguarde a liberação da manutenção antes de sair.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      <RewardCard reward={data.reward} score={driver.score} />

      {data.checklistPending && !data.blockedByChecklist ? (
        <Card style={styles.alertAttention}>
          <View style={styles.alertHead}>
            <View style={[styles.alertIcon, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="clipboard-outline" size={21} color={colors.warning} />
            </View>
            <View style={styles.alertCopy}>
              <Text variant="titleMd">Checklist antes de sair</Text>
              <Text variant="labelMd" tone="variant">
                Confirme os itens do {vinculo?.veiculo.plate ?? "caminhão"} para liberar a jornada.
              </Text>
            </View>
          </View>
          <Button
            icon={
              <Ionicons color={colors.onAccentSolid} name="checkmark-circle-outline" size={19} />
            }
            label="Fazer checklist"
            onPress={() => router.push("/checklist")}
            shape="pill"
          />
        </Card>
      ) : null}

      {actionError ? (
        <Card style={styles.alertCritical}>
          <View accessibilityRole="alert" style={styles.alertHead}>
            <Ionicons name="alert-circle-outline" size={21} color={colors.error} />
            <Text variant="labelMd" tone="error" style={styles.alertCopy}>
              {actionError}
            </Text>
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        {data.currentTrip ? (
          <>
            {data.route ? (
              <RouteMapCard
                onOpenTrip={() =>
                  router.push({ pathname: "/trip/[id]", params: { id: data.currentTrip!.id } })
                }
                route={data.route}
                trip={data.currentTrip}
              />
            ) : (
              <TripCard trip={data.currentTrip} featured />
            )}
            {action ? (
              <Button
                icon={<Ionicons color={colors.onAccentSolid} name="flag-outline" size={19} />}
                label={action}
                loading={advance.isPending}
                onPress={() => advance.mutate(data.currentTrip!.id)}
                shape="pill"
              />
            ) : null}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-done" size={24} color={colors.success} />
            </View>
            <View style={styles.alertCopy}>
              <Text variant="titleMd">Jornada em dia</Text>
              <Text variant="labelMd" tone="variant">
                A próxima viagem aparece aqui assim que a operação liberar.
              </Text>
            </View>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Acesso rápido" description="Tarefas mais usadas em campo." />
        <View style={styles.quickGrid}>
          <QuickAction
            icon="clipboard-outline"
            label="Checklist"
            onPress={() => router.push("/checklist")}
          />
          <QuickAction
            icon="water-outline"
            label="Abastecer"
            onPress={() => router.push("/fuel-entry")}
          />
          <QuickAction icon="map-outline" label="Viagens" onPress={() => router.push("/trips")} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Seu mês" description="Resumo operacional até agora." />
        <MetricStrip
          items={[
            { label: "Km rodados", value: formatKm(driver.kmDriven) },
            { label: "Viagens", value: String(driver.tripsCount), hint: "concluídas" },
            {
              label: "Eventos",
              value: String(driver.criticalEvents),
              hint: driver.criticalEvents === 0 ? "nenhum crítico" : "críticos",
              hintTone: driver.criticalEvents === 0 ? "positive" : "critical",
            },
          ]}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Próximas viagens"
          count={data.nextTrips.length > 0 ? String(data.nextTrips.length) : undefined}
        />
        {data.nextTrips.length > 0 ? (
          data.nextTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)
        ) : (
          <Card>
            <Text variant="bodyMd" tone="variant">
              Nada programado depois desta viagem.
            </Text>
          </Card>
        )}
      </View>

      {/* 60 dias é a janela em que ainda dá para renovar sem parar de rodar. */}
      {cnhDays <= 60 ? (
        <Card style={styles.alertAttention}>
          <View style={styles.alertHead}>
            <Ionicons name="card-outline" size={21} color={colors.warning} />
            <View style={styles.alertCopy}>
              <Text variant="titleMd">CNH a vencer</Text>
              <Text variant="labelMd" tone="variant">
                Vence em {formatDate(data.cnhExpiresAt)} ({cnhDays} dias). Agende a renovação.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}
    </SheetScreen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={styles.quickIcon}>
        <Ionicons color={colors.accent} name={icon} size={22} />
      </View>
      <Text variant="labelMd" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Scheme) =>
  StyleSheet.create({
    section: { gap: theme.space.md },
    semVinculo: {
      gap: theme.space.md,
      borderColor: colors.accent,
      borderWidth: StyleSheet.hairlineWidth,
    },
    profileButton: {
      width: HIT_TARGET,
      height: HIT_TARGET,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outline,
      backgroundColor: colors.heroSurface,
    },
    pressed: { opacity: 0.78 },
    alertHead: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
    alertIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.md,
    },
    alertCopy: { flex: 1, gap: 2 },
    alertCritical: { gap: theme.space.md, borderColor: colors.error },
    alertAttention: { gap: theme.space.md, borderColor: colors.warning },
    emptyCard: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
    emptyIcon: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      backgroundColor: colors.successSoft,
    },
    quickGrid: { flexDirection: "row", gap: theme.space.sm },
    quickAction: {
      minHeight: 94,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.space.sm,
      paddingHorizontal: theme.space.xs,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outline,
      backgroundColor: colors.surface,
    },
    quickIcon: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.md,
      backgroundColor: colors.accentSoft,
    },
  });
