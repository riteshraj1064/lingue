// app/(onboarding)/course-details.tsx
// SCREEN 8 — COURSE DETAILS
import { Ionicons } from "@expo/vector-icons";
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
import { colors, radius, shadows, spacing, typography } from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function CourseDetailsScreen() {
  const router = useRouter();
  const { selectedNativeLang, selectedTargetLang } = useApp();

  const handleContinue = () => {
    router.push("/(onboarding)/daily-goal");
  };

  const features = [
    {
      id: "words",
      icon: "ribbon",
      color: colors.reward,
      bg: colors.rewardLight,
      text: "5,000+ words & phrases",
      description: "Master vocabulary from basics to fluency",
    },
    {
      id: "grammar",
      icon: "book",
      color: "#FF9600",
      bg: "#FFF2E5",
      text: "Grammar essentials",
      description: "Simple rules, real-world examples",
    },
    {
      id: "speaking",
      icon: "headset",
      color: colors.secondaryBlue,
      bg: colors.secondaryBlueLight,
      text: "Listening & speaking",
      description: "Interactive pronunciation drills",
    },
    {
      id: "writing",
      icon: "create",
      color: colors.primary,
      bg: colors.primarySurface,
      text: "Reading & writing",
      description: "Stories, dialogues and fun quizzes",
    },
  ];

  return (
    <ScreenContainer scrollable={true} withBottomPadding={true}>
      <Header
        showBack={true}
        onBack={() => router.push("/(onboarding)/native-lang")}
        transparent={true}
        title="Course Preview"
        centerComponent={<ProgressIndicator currentStep={4} totalSteps={4} />}
      />

      {/* Course Banner Card */}
      <View style={styles.courseBannerCard}>
        <View style={styles.bannerInfo}>
          <View style={styles.pairBadge}>
            <Text style={styles.flagPair}>
              {selectedNativeLang.flag} ➔ {selectedTargetLang.flag}
            </Text>
          </View>
          <Text style={styles.courseTitle}>
            {selectedNativeLang.name} → {selectedTargetLang.name}
          </Text>
          <Text style={styles.courseSubtitle}>
            {selectedTargetLang.name} for {selectedNativeLang.name} speakers
          </Text>
        </View>

        {/* Landmark illustration aesthetic header */}
        <View style={styles.landmarkDecor}>
          <Text style={styles.landmarkEmoji}>🎡 🏛️ 🗼</Text>
        </View>
      </View>

      {/* Mascot note */}
      <View style={styles.mascotRow}>
        <Mascot size="small" pose="studying" />
        <View style={styles.mascotCard}>
          <Text style={styles.mascotNoteTitle}>Personalized Curriculum</Text>
          <Text style={styles.mascotNoteDesc}>
            Specially tailored for your native {selectedNativeLang.name} pronunciation habits!
          </Text>
        </View>
      </View>

      {/* Features List */}
      <View style={styles.featuresSection}>
        {features.map((feat) => (
          <View key={feat.id} style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: feat.bg }]}>
              <Ionicons name={feat.icon as any} size={22} color={feat.color} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feat.text}</Text>
              <Text style={styles.featureDesc}>{feat.description}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
        ))}
      </View>

      {/* Bottom Sticky Action Area */}
      <View style={styles.bottomSection}>
        <ProgressIndicator
          currentStep={4}
          totalSteps={4}
          style={styles.bottomDots}
        />
        <PrimaryButton
          title="Continue"
          size="large"
          onPress={handleContinue}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  courseBannerCard: {
    backgroundColor: colors.backgroundBlue,
    borderRadius: radius.largeCard,
    padding: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: "#E1EDFF",
    position: "relative",
    overflow: "hidden",
    ...shadows.subtle,
  },
  bannerInfo: {
    zIndex: 2,
  },
  pairBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  flagPair: {
    ...typography.caption,
    fontWeight: "700",
  },
  courseTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  courseSubtitle: {
    ...typography.bodyMedium,
    color: colors.secondaryBlueDark,
    marginTop: 2,
    fontWeight: "600",
  },
  landmarkDecor: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  landmarkEmoji: {
    fontSize: 28,
    opacity: 0.85,
  },
  mascotRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundPurple,
    padding: 12,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primarySurface,
  },
  mascotCard: {
    flex: 1,
    marginLeft: 12,
  },
  mascotNoteTitle: {
    ...typography.label,
    color: colors.primary,
    fontWeight: "800",
  },
  mascotNoteDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  featuresSection: {
    width: "100%",
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    marginBottom: 10,
    ...shadows.subtle,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyLarge,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  featureDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomSection: {
    width: "100%",
    marginTop: spacing.md,
    alignItems: "center",
  },
  bottomDots: {
    marginBottom: spacing.lg,
  },
});
