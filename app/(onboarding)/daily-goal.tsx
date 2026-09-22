// app/(onboarding)/daily-goal.tsx
// SCREEN 9 — DAILY GOAL
import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CustomAlertModal } from "../../components/CustomAlertModal";
import { GoalCard } from "../../components/GoalCard";
import { Header } from "../../components/Header";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenContainer } from "../../components/ScreenContainer";
import { DAILY_GOALS, colors, shadows, spacing, typography } from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function DailyGoalScreen() {
  const router = useRouter();
  const { selectedGoalId, setDailyGoalId, completeOnboarding } = useApp();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const showError = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleContinue = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      showError("Error", "You must be logged in.");
      return;
    }

    const selectedGoal = DAILY_GOALS.find(g => g.id === selectedGoalId);
    const dailyGoalMinutes = selectedGoal?.minutes || 10;

    const { error } = await supabase
      .from("profiles")
      .update({ daily_goal_minutes: dailyGoalMinutes })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating daily goal:", error);
      showError("Error", "Failed to update daily goal. " + error.message);
      return;
    }

    await completeOnboarding();
    router.push("/(onboarding)/complete");
  };

  return (
    <>
      <ScreenContainer scrollable={true} withBottomPadding={true}>
      <Header
        showBack={true}
        onBack={() => router.push("/(onboarding)/course-details")}
        transparent={true}
      />

      {/* Top Trophy Icon */}
      <View style={styles.headerSection}>
        <View style={styles.trophyCircle}>
          <Ionicons name="trophy" size={32} color={colors.reward} />
        </View>
        <Text style={styles.heading}>Daily Goal</Text>
        <Text style={styles.subtitle}>Set your daily learning goal</Text>
      </View>

      {/* Goal Cards */}
      <View style={styles.goalsList}>
        {DAILY_GOALS.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            selected={selectedGoalId === goal.id}
            onPress={(item) => setDailyGoalId(item.id)}
          />
        ))}
      </View>

      {/* Motivational Tip Card */}
      <View style={styles.tipCard}>
        <Text style={styles.tipEmoji}>💡</Text>
        <Text style={styles.tipText}>
          You can change your daily goal anytime in your profile settings.
        </Text>
      </View>

      {/* Bottom Sticky Action Area */}
      <View style={styles.bottomSection}>
        <PrimaryButton
          title="Continue"
          size="large"
          onPress={handleContinue}
        />
      </View>
    </ScreenContainer>

      <CustomAlertModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        type="error"
        title={alertTitle}
        message={alertMessage}
        buttons={[{ text: "OK", style: "default" }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  trophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.rewardLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#FFEAA3",
    ...shadows.subtle,
  },
  heading: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  goalsList: {
    width: "100%",
    marginBottom: spacing.sm,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundPurple,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primarySurface,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  tipEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  tipText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  bottomSection: {
    width: "100%",
    marginTop: spacing.xs,
  },
});
