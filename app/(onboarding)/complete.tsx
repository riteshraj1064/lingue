// app/(onboarding)/complete.tsx
// SCREEN 10 — ONBOARDING COMPLETE
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Confetti } from "../../components/Confetti";
import { Header } from "../../components/Header";
import { Mascot } from "../../components/Mascot";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenContainer } from "../../components/ScreenContainer";
import { colors, radius, spacing, typography } from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const { selectedNativeLang, selectedTargetLang, selectedGoalId } = useApp();

  const handleGoHome = () => {
    router.replace("/(tabs)");
  };

  const getGoalText = () => {
    switch (selectedGoalId) {
      case "casual":  return "Casual \u2022 5 min/day";
      case "serious": return "Serious \u2022 15 min/day";
      case "intense": return "Intense \u2022 20 min/day";
      case "regular":
      default:        return "Regular \u2022 10 min/day";
    }
  };

  return (
    <ScreenContainer scrollable={true} withBottomPadding={true}>
      <Confetti />
      <Header showBack={true} onBack={() => router.push("/(onboarding)/daily-goal")} transparent={true} />

      <View style={styles.headerSection}>
        <Text style={styles.heading}>You’re all set!</Text>
      </View>

      <View style={styles.mascotSection}>
        <Mascot size="celebration" pose="celebrating" speechText="Woohoo! You're ready to learn!" />
      </View>

      <View style={styles.summaryCard}>
        <View pointerEvents="none" style={styles.glassTopEdge} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryIconBox}><Text style={styles.summaryEmoji}>🌍</Text></View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Course</Text>
            <Text style={styles.summaryValue}>
              {(selectedNativeLang?.name || "English") + " \u2192 " + (selectedTargetLang?.name || "Spanish") + " " + (selectedTargetLang?.flag || "🇪🇸")}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryIconBox}><Text style={styles.summaryEmoji}>⏱️</Text></View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Daily Goal</Text>
            <Text style={styles.summaryValue}>{getGoalText()}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryIconBox}><Text style={styles.summaryEmoji}>🌱</Text></View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Starting Level</Text>
            <Text style={styles.summaryValue}>Level 1 • Beginner</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
      </View>

      {/* Glass Pill Tagline */}
      <View style={styles.taglinePill}>
        <View pointerEvents="none" style={styles.pillTopEdge} />
        <Ionicons name="sparkles" size={14} color="rgba(104,71,245,0.70)" style={styles.taglineIcon} />
        <Text style={styles.taglineText}>Let’s start your language learning journey.</Text>
        <Ionicons name="sparkles" size={14} color="rgba(104,71,245,0.70)" style={styles.taglineIcon} />
      </View>

      {/* Glass Footer CTA */}
      <View style={styles.glassFooter}>
        <View pointerEvents="none" style={styles.glassTopEdge} />
        <View style={styles.footerInner}>
          <Ionicons name="rocket-outline" size={18} color="rgba(104,71,245,0.60)" />
          <Text style={styles.footerHint}>Your adventure begins now</Text>
        </View>
        <PrimaryButton title="Go to Home" size="large" onPress={handleGoHome} style={styles.homeButton} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  glassTopEdge: { position: "absolute", top: 0, left: 1, right: 1, height: 1, backgroundColor: "rgba(255,255,255,0.70)" },
  pillTopEdge:  { position: "absolute", top: 0, left: 1, right: 1, height: 1, backgroundColor: "rgba(255,255,255,0.80)" },
  headerSection: { alignItems: "center", marginTop: spacing.xs, marginBottom: spacing.xs },
  heading: { ...typography.hero, color: colors.textPrimary, textAlign: "center", fontWeight: "900" },
  mascotSection: { alignItems: "center", marginVertical: spacing.md },
  summaryCard: {
    backgroundColor: "rgba(104,71,245,0.035)",
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.16)",
    width: "100%",
    marginBottom: spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  summaryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  summaryIconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(104,71,245,0.08)",
    alignItems: "center", justifyContent: "center",
    marginRight: 12, borderWidth: 1, borderColor: "rgba(104,71,245,0.14)",
  },
  summaryEmoji: { fontSize: 20 },
  summaryTextContainer: { flex: 1 },
  summaryLabel: { ...typography.tiny, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "700" },
  summaryValue: { ...typography.bodyMedium, color: colors.textPrimary, fontWeight: "800", marginTop: 2 },
  summaryDivider: { height: 1, backgroundColor: "rgba(104,71,245,0.10)", marginVertical: 4 },
  taglinePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(104,71,245,0.055)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.20)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: spacing.lg,
    position: "relative",
    overflow: "hidden",
  },
  taglineIcon: { marginHorizontal: 4 },
  taglineText: { ...typography.caption, color: colors.textSecondary, textAlign: "center", fontWeight: "700", flexShrink: 1 },
  glassFooter: {
    width: "100%",
    backgroundColor: "rgba(104,71,245,0.045)",
    borderRadius: radius.card,
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.18)",
    padding: 16,
    position: "relative",
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  footerInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 12 },
  footerHint: { ...typography.caption, color: "rgba(104,71,245,0.72)", fontWeight: "700", letterSpacing: 0.3 },
  homeButton: { backgroundColor: colors.primary },
});
