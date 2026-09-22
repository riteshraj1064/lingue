// app/(onboarding)/welcome.tsx
// SCREEN 5 — ONBOARDING WELCOME
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Header } from "../../components/Header";
import { Mascot } from "../../components/Mascot";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ProgressIndicator } from "../../components/ProgressIndicator";
import { ScreenContainer } from "../../components/ScreenContainer";
import { colors, radius, spacing, typography } from "../../constant/constant";

export default function OnboardingWelcomeScreen() {
  const router = useRouter();


  return (
    <ScreenContainer
      scrollable={true}
      backgroundColor="#FBF9FE"
      withBottomPadding={true}
    >
      <Header
        showBack={true}
        onBack={() => router.push("/(auth)/login")}
        transparent={true}
        centerComponent={<ProgressIndicator currentStep={1} totalSteps={4} />}
      />

      <View style={styles.content}>
        {/* Headings */}
        <View style={styles.textContainer}>
          <Text style={styles.heading}>Learn languages{"\n"}the fun way</Text>
          <Text style={styles.subtitle}>
            Build a daily habit and make progress one lesson at a time.
          </Text>
        </View>

        {/* Illustrated Landscape & Path with Mascot */}
        <View style={styles.illustrationContainer}>
          {/* Floating coins */}
          <View style={[styles.floatingCoin, styles.coinLeft]}>
            <Text style={styles.coinEmoji}>🪙</Text>
          </View>
          <View style={[styles.floatingCoin, styles.coinRight]}>
            <Text style={styles.coinEmoji}>🪙</Text>
          </View>

          {/* Center Mascot */}
          <Mascot
            size="onboarding"
            pose="welcoming"
            speechText="Let's learn something new today!"
          />

          {/* Yellow Star Marker & Path Base */}
          <View style={styles.pathPlatform}>
            <View style={styles.starBadge}>
              <Text style={styles.starText}>⭐</Text>
            </View>
            <View style={styles.curvedPath} />
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomSection}>
          <ProgressIndicator
            currentStep={1}
            totalSteps={4}
            style={styles.bottomDots}
          />

          <PrimaryButton
            title="Let's Start"
            size="large"
            onPress={() => router.push("/(onboarding)/courses")}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
    paddingHorizontal: 12,
  },
  heading: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 38,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    maxWidth: 320,
  },
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
    minHeight: 280,
    marginVertical: spacing.md,
  },
  floatingCoin: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.rewardLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.reward,
  },
  coinLeft: {
    top: 20,
    left: 24,
  },
  coinRight: {
    top: 30,
    right: 28,
  },
  coinEmoji: {
    fontSize: 18,
  },
  pathPlatform: {
    alignItems: "center",
    marginTop: -15,
    width: "100%",
  },
  starBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.reward,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
    zIndex: 5,
    shadowColor: colors.rewardDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  starText: {
    fontSize: 26,
  },
  curvedPath: {
    width: 140,
    height: 30,
    backgroundColor: "#EBDDB2",
    borderRadius: radius.largeCard,
    marginTop: -15,
    borderWidth: 1,
    borderColor: "#DFC888",
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  bottomDots: {
    marginBottom: spacing.lg,
  },
});
