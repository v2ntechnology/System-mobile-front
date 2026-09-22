import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import { formatCurrency, formatCurrencyCompact, formatDate } from "@/lib/format";
import { theme, useColors } from "@/theme";
import type { DriverReward } from "@/types";

import { ScoreRing } from "./score-ring";

interface Props {
  reward: DriverReward;
  score: number;
  detailed?: boolean;
}

export function RewardCard({ reward, score, detailed = false }: Props) {
  const colors = useColors();
  const nextTier = reward.tiers.find((tier) => tier.minScore > score);
  const pointsToNextTier = nextTier ? nextTier.minScore - score : 0;

  return (
    <LinearGradient
      accessibilityLabel={`Premiação estimada de ${formatCurrency(reward.estimatedAmount)} com score ${score}`}
      colors={[...theme.brandGradient]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.card, !detailed && styles.cardCompact]}
    >
      <View style={styles.head}>
        <View style={styles.program}>
          <Ionicons color={colors.onAccentSolid} name="trophy-outline" size={17} />
          <Text tone="onAccent" variant="overline" numberOfLines={1}>
            {reward.programName} · {reward.periodLabel}
          </Text>
        </View>

        <View style={[styles.rank, { backgroundColor: `${colors.onAccentSolid}29` }]}>
          <Text tone="onAccent" variant="labelSm" tabular>
            {reward.position}º de {reward.participantCount}
          </Text>
        </View>
      </View>

      <View style={styles.main}>
        <View style={styles.amountCopy}>
          <Text tone="onAccent" variant="labelSm" style={styles.mutedOnAccent}>
            Premiação estimada
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.76}
            numberOfLines={1}
            tone="onAccent"
            variant="headlineLg"
            tabular
          >
            {formatCurrency(reward.estimatedAmount)}
          </Text>
          <Text tone="onAccent" variant="labelSm" style={styles.mutedOnAccent}>
            Valor provisório até {formatDate(reward.closesAt)}
          </Text>
        </View>

        {!detailed ? (
          <ScoreRing
            color={colors.onAccentSolid}
            score={score}
            size={70}
            strokeWidth={7}
            textColor={colors.onAccentSolid}
            trackColor={`${colors.onAccentSolid}42`}
          />
        ) : null}
      </View>

      <View style={[styles.goal, { backgroundColor: `${colors.surfaceSunken}2E` }]}>
        <Ionicons
          color={colors.onAccentSolid}
          name={nextTier ? "trending-up" : "checkmark-circle"}
          size={18}
        />
        <Text tone="onAccent" variant="labelMd" style={styles.goalCopy}>
          {nextTier
            ? `Falta ${pointsToNextTier} ${pointsToNextTier === 1 ? "ponto" : "pontos"} para ${formatCurrency(nextTier.amount)}`
            : `Você alcançou a faixa máxima de ${formatCurrency(reward.maxAmount)}`}
        </Text>
      </View>

      {detailed ? (
        <View style={styles.tiers}>
          {reward.tiers.map((tier) => {
            const reached = score >= tier.minScore;
            return (
              <View
                key={tier.minScore}
                style={[
                  styles.tier,
                  { borderColor: `${colors.onAccentSolid}47` },
                  reached && { backgroundColor: `${colors.onAccentSolid}24` },
                ]}
              >
                <Text tone="onAccent" variant="labelSm" tabular>
                  {tier.minScore}+
                </Text>
                <Text tone="onAccent" variant="labelSm" tabular style={styles.mutedOnAccent}>
                  {formatCurrencyCompact(tier.amount)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.xl,
  },
  cardCompact: { gap: theme.space.sm, padding: theme.space.md },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space.md,
  },
  program: { flex: 1, flexDirection: "row", alignItems: "center", gap: theme.space.sm },
  rank: {
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.pill,
  },
  main: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space.lg,
  },
  amountCopy: { flex: 1, gap: 2 },
  mutedOnAccent: { opacity: 0.82 },
  goal: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.md,
  },
  goalCopy: { flex: 1 },
  tiers: { flexDirection: "row", gap: theme.space.sm },
  tier: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
