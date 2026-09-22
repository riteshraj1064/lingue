// app/(auth)/forgot-password.tsx
// SCREEN 4 — FORGOT PASSWORD (Supabase Integrated)
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Header } from "../../components/Header";
import { Mascot } from "../../components/Mascot";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenContainer } from "../../components/ScreenContainer";
import { TextInput } from "../../components/TextInput";
import { colors, radius, spacing, typography } from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useApp();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSendLink = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await resetPassword(email.trim());
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || "Could not send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable={true} withBottomPadding={true}>
      <Header
        showBack={true}
        onBack={() => router.push("/(auth)/login")}
        transparent={true}
      />

      <View style={styles.headerSection}>
        <Text style={styles.heading}>Forgot password?</Text>
        <Text style={styles.subtitle}>
          No worries! Enter your email and we'll send you a link to reset your password.
        </Text>
      </View>

      <View style={styles.formSection}>
        {submitted ? (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>📬</Text>
            <Text style={styles.successTitle}>Check your inbox!</Text>
            <Text style={styles.successText}>
              We sent password reset instructions to{"\n"}
              <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{email}</Text>
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              placeholder="Email address"
              leftIcon="mail-outline"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError("");
              }}
              error={error}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <PrimaryButton
              title="Send Reset Link"
              onPress={handleSendLink}
              loading={loading}
              style={styles.sendButton}
            />
          </>
        )}
      </View>

      {/* Mascot with letter/envelope */}
      <View style={styles.mascotSection}>
        <Mascot
          size="auth"
          pose="letter"
          speechText={submitted ? "We've got your back!" : "We'll get you back on track!"}
        />
      </View>

      {/* Back to Login Link */}
      <View style={styles.footerSection}>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.7}
          style={styles.backLoginButton}
        >
          <Text style={styles.backLoginText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    paddingHorizontal: 8,
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
    marginTop: 8,
    lineHeight: 22,
  },
  formSection: {
    width: "100%",
    marginTop: spacing.xs,
  },
  sendButton: {
    marginTop: 4,
    marginBottom: spacing.md,
  },
  mascotSection: {
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  footerSection: {
    alignItems: "center",
    marginTop: spacing.xs,
  },
  backLoginButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backLoginText: {
    ...typography.button,
    color: colors.primary,
  },
  successCard: {
    backgroundColor: colors.backgroundGreen,
    borderRadius: radius.card,
    padding: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.successLight,
    marginBottom: spacing.md,
  },
  successEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  successTitle: {
    ...typography.h3,
    color: colors.successDark,
    marginBottom: 4,
  },
  successText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
