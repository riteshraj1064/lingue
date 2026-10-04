// app/(auth)/signup.tsx
// SCREEN 3 — SIGN UP (Supabase OTP + Glassmorphism)
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Canvas, Rect, LinearGradient, vec, Circle } from "@shopify/react-native-skia";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mascot } from "../../components/Mascot";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SocialButton } from "../../components/SocialButton";
import { TextInput } from "../../components/TextInput";
import { colors, spacing, typography, radius } from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function SignupScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp } = useApp();
  const { width, height } = useWindowDimensions();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendOtp(email.trim(), name.trim());
      setStep("otp");
    } catch (e: any) {
      setError(e?.message || "Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await verifyOtp(email.trim(), otp.trim());
      router.replace("/(onboarding)/welcome");
    } catch (e: any) {
      setError(e?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Skia Background strictly matching AGENTS.md requirements */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={["#F5F2FF", "#F0EDFF", "#F8F8FF", "#EEF9F7"]}
          />
        </Rect>
        <Circle cx={width * 0.88} cy={height * 0.13} r={width * 0.57} color="rgba(111,82,245,0.14)" />
        <Circle cx={-width * 0.05} cy={height * 0.78} r={width * 0.53} color="rgba(61,205,226,0.13)" />
        <Circle cx={width * 0.65} cy={height * 0.95} r={width * 0.44} color="rgba(112,87,245,0.10)" />
      </Canvas>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subtitle}>Start your language learning adventure.</Text>
          </View>

          <View style={styles.mascotSection}>
            <Mascot
              size="auth"
              pose={error ? "welcoming" : "letter"}
              speechText={error ? "Oops! Check your details" : step === "email" ? "Let's get started!" : "Check your email!"}
            />
          </View>

          {/* Glass Card */}
          <View style={styles.glassCard}>
            {step === "email" ? (
              <>
                <TextInput
                  placeholder="Full name"
                  leftIcon="person-outline"
                  variant="glass"
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (error) setError("");
                  }}
                />

                <TextInput
                  placeholder="Email address"
                  leftIcon="mail-outline"
                  variant="glass"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (error) setError("");
                  }}
                />
                
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <PrimaryButton
                  title="Send Signup Code"
                  onPress={handleSendOtp}
                  loading={loading}
                  style={styles.actionButton}
                />

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialRow}>
                  <SocialButton
                    provider="google"
                    onPress={() => {
                      // Handled by Supabase or mock
                      console.log("Google Signup pressed");
                    }}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.otpPrompt}>We sent a code to {email}</Text>
                <TextInput
                  placeholder="6-digit code"
                  leftIcon="key-outline"
                  variant="glass"
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text);
                    if (error) setError("");
                  }}
                  keyboardType="number-pad"
                />
                
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <PrimaryButton
                  title="Verify & Sign Up"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  style={styles.actionButton}
                />
                <TouchableOpacity onPress={() => setStep("email")} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Change email</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsText}>
            By signing up, you accept our Terms and Conditions
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F2FF" },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
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
    marginBottom: spacing.xl,
  },
  glassCard: {
    backgroundColor: "rgba(104,71,245,0.035)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
    borderRadius: radius.card,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  otpPrompt: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  actionButton: {
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  backButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
    marginBottom: spacing.xs,
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
  termsText: {
    ...typography.tiny,
    color: "rgba(98,96,120,0.68)",
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(104,71,245,0.16)",
  },
  dividerText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginHorizontal: 12,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
});
