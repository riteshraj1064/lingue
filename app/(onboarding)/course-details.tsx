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
import { colors, radius, spacing, typography } from "../../constant/constant";
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
      bg: "rgba(247,183,24,0.12)",
      text: "5,000+ words & phrases",
      description: "Master vocabulary from basics to fluency",
    },
    {
      id: "grammar",
      icon: "book",
      color: "#FF9600",
      bg: "rgba(255,150,0,0.12)",
      text: "Grammar essentials",
      description: "Simple rules, real-world examples",
    },
    {
      id: "speaking",
      icon: "headset",
      color: colors.secondaryBlue,
      bg: "rgba(61,205,226,0.12)",
      text: "Listening & speaking",
      description: "Interactive pronunciation drills",
    },
    {
      id: "writing",
      icon: "create",
      color: colors.primary,
      bg: "rgba(104,71,245,0.12)",
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

      {/* Course Glass Banner Card */}
      <View style={styles.courseBannerCard}>
        <View pointerEvents="none" style={styles.glassTopEdge} />
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

        {/* Landmark illustration header */}
        <View style={styles.landmarkDecor}>
          <Text style={styles.landmarkEmoji}>🎡 🏛️ 🗼</Text>
        </View>
      </View>

      {/* Mascot glass note */}
      <View style={styles.mascotRow}>
        <View pointerEvents="none" style={styles.glassTopEdge} />
        <Mascot size="small" pose="studying" />
        <View style={styles.mascotCard}>
          <Text style={styles.mascotNoteTitle}>Personalized Curriculum</Text>
          <Text style={styles.mascotNoteDesc}>
            Specially tailored for your native {selectedNativeLang.name} pronunciation habits!
          </Text>
        </View>
      </View>

      {/* Features Glass List */}
      <View style={styles.featuresSection}>
        {features.map((feat) => (
          <View key={feat.id} style={styles.featureItem}>
            <View pointerEvents="none" style={styles.glassTopEdge} />
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
  glassTopEdge: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.70)",
  },
  courseBannerCard: {
    backgroundColor: "rgba(104,71,245,0.05)",
    borderRadius: radius.largeCard,
    padding: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.18)",
    position: "relative",
    overflow: "hidden",
  },
  bannerInfo: {
    zIndex: 2,
  },
  pairBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(104,71,245,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.14)",
  },
  flagPair: {
    ...typography.caption,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  courseTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: "900",
  },
  courseSubtitle: {
    ...typography.bodyMedium,
    color: colors.secondaryBlueDark,
    marginTop: 2,
    fontWeight: "700",
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
    backgroundColor: "rgba(104,71,245,0.04)",
    padding: 12,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.16)",
    position: "relative",
    overflow: "hidden",
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
    fontWeight: "600",
  },
  featuresSection: {
    width: "100%",
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(104,71,245,0.035)",
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.14)",
    marginBottom: 10,
    position: "relative",
    overflow: "hidden",
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.12)",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyLarge,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  featureDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
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
