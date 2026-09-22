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
import { colors, radius, shadows, spacing, typography } from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const { selectedNativeLang, selectedTargetLang, selectedGoalId } = useApp();

  const handleGoHome = () => {
    router.replace("/(tabs)");
  };

  const getGoalText = () => {
    switch (selectedGoalId) {
      case "casual":
        return "Casual • 5 min/day";
      case "serious":
        return "Serious • 15 min/day";
      case "intense":
        return "Intense • 20 min/day";
      case "regular":
      default:
        return "Regular • 10 min/day";
    }
  };

  return (
    <ScreenContainer scrollable={true} withBottomPadding={true}>
      {/* Celebration Confetti Effect */}
      <Confetti />

      <Header
        showBack={true}
        onBack={() => router.push("/(onboarding)/daily-goal")}
        transparent={true}
      />

      <View style={styles.headerSection}>
        <Text style={styles.heading}>You're all set!</Text>
      </View>

      {/* Large Celebrating Mascot */}
      <View style={styles.mascotSection}>
        <Mascot
          size="celebration"
          pose="celebrating"
          speechText="Woohoo! You're ready to learn!"
        />
      </View>

      {/* Summary Recap Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryIconBox}>
            <Text style={styles.summaryEmoji}>🌍</Text>
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Course</Text>
            <Text style={styles.summaryValue}>
              {selectedNativeLang.name} → {selectedTargetLang.name} {selectedTargetLang.flag}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryIconBox}>
            <Text style={styles.summaryEmoji}>⏱️</Text>
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Daily Goal</Text>
            <Text style={styles.summaryValue}>{getGoalText()}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryIconBox}>
            <Text style={styles.summaryEmoji}>🌱</Text>
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Starting Level</Text>
            <Text style={styles.summaryValue}>Level 1 • Beginner</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
      </View>

      {/* Motivational Tagline */}
      <View style={styles.messageSection}>
        <Text style={styles.journeyMessage}>
          Let's start your language learning journey.
        </Text>
      </View>

      {/* Primary Go to Home Button */}
      <View style={styles.bottomSection}>
        <PrimaryButton
          title="Go to Home"
          size="large"
          onPress={handleGoHome}
          style={styles.homeButton}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  heading: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: "center",
  },
  mascotSection: {
    alignItems: "center",
    marginVertical: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    width: "100%",
    marginBottom: spacing.md,
    ...shadows.card,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundOffWhite,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryEmoji: {
    fontSize: 18,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: "700",
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  messageSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  journeyMessage: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },
  bottomSection: {
    width: "100%",
    marginTop: spacing.xs,
  },
  homeButton: {
    backgroundColor: colors.primary,
  },
});
