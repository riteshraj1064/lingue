// app/(onboarding)/welcome.tsx
// SCREEN 5 — ONBOARDING WELCOME
import { useRouter } from "expo-router";
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

        {/* Illustrated Landscape & Path with Mascot in Glass Environment */}
        <View style={styles.illustrationContainer}>
          {/* Ambient Glow behind mascot */}
          <View style={styles.mascotGlow} />

          {/* Floating glass coins */}
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

          {/* Glass Star Marker & Platform Base */}
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
    fontWeight: "900",
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    maxWidth: 320,
    fontWeight: "600",
  },
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
    minHeight: 280,
    marginVertical: spacing.md,
  },
  mascotGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(104,71,245,0.08)",
  },
  floatingCoin: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(247,183,24,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(247,183,24,0.35)",
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
    fontSize: 20,
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
    backgroundColor: "rgba(247,183,24,0.20)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(247,183,24,0.40)",
    zIndex: 5,
  },
  starText: {
    fontSize: 26,
  },
  curvedPath: {
    width: 140,
    height: 28,
    backgroundColor: "rgba(104,71,245,0.06)",
    borderRadius: radius.largeCard,
    marginTop: -14,
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.16)",
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
