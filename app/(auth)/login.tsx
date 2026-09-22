// app/(auth)/login.tsx
// SCREEN 2 — LOGIN (Supabase Integrated)
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
import { colors, spacing, typography } from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function LoginScreen() {
  const router = useRouter();
  const { login, selectedCourse } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await login(email.trim(), password);
      console.log("Login response:", res);
      if (res.courseRestored) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(onboarding)/welcome");
      }
    } catch (e: any) {
      const msg = e?.message || "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <ScreenContainer scrollable={true} withBottomPadding={true}>
      <View style={styles.headerSection}>
        <Text style={styles.heading}>Welcome back!</Text>
        <Text style={styles.subtitle}>Log in to continue your journey</Text>
      </View>

      {/* Mascot below heading */}
      <View style={styles.mascotSection}>
        <Mascot
          size="auth"
          pose="welcoming"
          speechText={error ? "Oops! Check your details" : "Ready for today's lesson?"}
        />
      </View>

      {/* Form Fields */}
      <View style={styles.formSection}>
        <TextInput
          placeholder="Email address"
          leftIcon="mail-outline"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError("");
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          placeholder="Password"
          leftIcon="lock-closed-outline"
          isPassword={true}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) setError("");
          }}
          error={error}
        />

        <TouchableOpacity
          onPress={() => router.push("/(auth)/forgot-password")}
          style={styles.forgotPasswordButton}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        <PrimaryButton
          title="Log In"
          onPress={handleLogin}
          loading={loading}
          style={styles.loginButton}
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
              // Mock social SSO or Supabase OAuth
              login("google_user@lingua.app", "password123").catch(() => { });
              router.replace("/(onboarding)/welcome");
            }}
          />
          <View style={{ width: 12 }} />
          <SocialButton
            provider="apple"
            onPress={() => {
              login("apple_user@lingua.app", "password123").catch(() => { });
              router.replace("/(onboarding)/welcome");
            }}
          />
        </View>

        {/* Bottom Signup Navigation */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup")}
            activeOpacity={0.7}
          >
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
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
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  mascotSection: {
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  formSection: {
    width: "100%",
    marginTop: spacing.xs,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: -6,
    marginBottom: spacing.md,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  loginButton: {
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  demoFill: {
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: spacing.xs,
  },
  demoFillText: {
    ...typography.tiny,
    color: colors.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.sm,
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
    marginBottom: spacing.lg,
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
  signupLink: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: "800",
  },
});
