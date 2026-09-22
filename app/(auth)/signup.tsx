// app/(auth)/signup.tsx
// SCREEN 3 — SIGN UP (Supabase Integrated)
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Mascot } from "../../components/Mascot";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SocialButton } from "../../components/SocialButton";
import { TextInput } from "../../components/TextInput";
import { colors, radius, spacing, typography } from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useApp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const validate = () => {
    const err: { [key: string]: string } = {};
    if (!name.trim()) err.name = "Full name is required";
    if (!email.trim() || !email.includes("@")) err.email = "Please enter a valid email address";
    if (!password || password.length < 6) err.password = "Password must be at least 6 characters";
    if (password !== confirmPassword) err.confirmPassword = "Passwords do not match";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await signup(name.trim(), email.trim(), password);

      if (res.needsEmailConfirmation) {
        setNeedsVerification(true);
      } else {
        router.replace("/(onboarding)/welcome");
      }
    } catch (e: any) {
      setErrors({ email: e?.message || "Could not create account. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable={true} withBottomPadding={true}>

      <View style={styles.headerSection}>
        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subtitle}>Start your language learning adventure.</Text>
      </View>

      {needsVerification ? (
        <View style={styles.verifyCard}>
          <Mascot size="auth" pose="letter" speechText="Almost there!" />
          <Text style={styles.verifyTitle}>Check your email!</Text>
          <Text style={styles.verifyText}>
            We've sent a verification link to{"\n"}
            <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{email}</Text>
            {"\n\n"}Please confirm your email, then log in to start learning!
          </Text>

          <PrimaryButton
            title="Go to Login"
            onPress={() => router.replace("/(auth)/login")}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <View style={styles.formSection}>
          <TextInput
            placeholder="Full name"
            leftIcon="person-outline"
            value={name}
            onChangeText={(val) => {
              setName(val);
              if (errors.name) setErrors({ ...errors, name: "" });
            }}
            error={errors.name}
          />

          <TextInput
            placeholder="Email address"
            leftIcon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            error={errors.email}
          />

          <TextInput
            placeholder="Password (min 6 chars)"
            leftIcon="lock-closed-outline"
            isPassword={true}
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (errors.password) setErrors({ ...errors, password: "" });
            }}
            error={errors.password}
          />

          <TextInput
            placeholder="Confirm password"
            leftIcon="lock-closed-outline"
            isPassword={true}
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
            }}
            error={errors.confirmPassword}
          />

          <PrimaryButton
            title="Sign Up"
            onPress={handleSignup}
            loading={loading}
            style={styles.signupButton}
          />

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social SSO Buttons */}
          <View style={styles.socialRow}>
            <SocialButton
              provider="google"
              onPress={() => {
                signup("Google User", "google_user@lingua.app", "password123").catch(() => { });
                router.replace("/(onboarding)/welcome");
              }}
            />
            <View style={{ width: 12 }} />
            <SocialButton
              provider="apple"
              onPress={() => {
                signup("Apple User", "apple_user@lingua.app", "password123").catch(() => { });
                router.replace("/(onboarding)/welcome");
              }}
            />
          </View>

          {/* Bottom Login Navigation */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
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
  formSection: {
    width: "100%",
    marginTop: spacing.xs,
  },
  signupButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: 12,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: spacing.xl,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  footerText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: "800",
  },
  verifyCard: {
    backgroundColor: colors.backgroundGreen,
    borderRadius: radius.card,
    padding: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.successLight,
    marginTop: spacing.md,
    width: "100%",
  },
  verifyTitle: {
    ...typography.h3,
    color: colors.successDark,
    marginTop: 12,
    marginBottom: 6,
  },
  verifyText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
