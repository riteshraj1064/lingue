// app/(onboarding)/courses.tsx
// SCREEN 6 — COURSE SELECTION
import { supabase } from "@/services/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GameLoader } from "../../components/GameLoader";
import { Header } from "../../components/Header";
import { LanguageCard } from "../../components/LanguageCard";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ProgressIndicator } from "../../components/ProgressIndicator";
import { ScreenContainer } from "../../components/ScreenContainer";
import { codeToFlag, colors, spacing, typography } from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function CourseSelectionScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [targetLanguages, setTargetLanguages] = useState<any[]>([]);
  const { selectedTargetLang, setTargetLanguage } = useApp();

  useEffect(() => {
    const getTargetLanguage = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("target_languages")
        .select("*");
      if (error || !data || data.length === 0) {
        console.log("error fetching languages: ", error);
        setIsLoading(false);
        return;
      }
      setTargetLanguages(data.map((l: any) => ({ ...l, flag: codeToFlag(l.flag) })));
      setIsLoading(false);
    };
    getTargetLanguage();
  }, []);

  const handleContinue = () => {
    router.push({
      pathname: "/(onboarding)/native-lang",
      params: {
        languages: JSON.stringify(targetLanguages),
      },
    });
  };

  return (
    <ScreenContainer scrollable={true} withBottomPadding={true}>
      <Header
        showBack={true}
        onBack={() => router.push("/(onboarding)/welcome")}
        transparent={true}
        centerComponent={<ProgressIndicator currentStep={2} totalSteps={4} />}
      />

      <View style={styles.headerSection}>
        <Text style={styles.heading}>I want to learn...</Text>
        <Text style={styles.subtitle}>Choose a language to start your journey.</Text>
      </View>

      {/* Language List / Game Loader */}
      <View style={styles.listSection}>
        {isLoading ? (
          <View style={styles.loaderWrapper}>
            <GameLoader variant="inline" message="Summoning language paths... ✨" />
            <GameLoader variant="cards" cardCount={4} />
          </View>
        ) : (
          targetLanguages.map((lang) => (
            <LanguageCard
              key={lang.id}
              language={lang}
              selected={selectedTargetLang?.id === lang.id}
              onPress={(item) => setTargetLanguage(item)}
            />
          ))
        )}
      </View>

      {/* Bottom Sticky Action Area */}
      <View style={styles.bottomSection}>
        <ProgressIndicator
          currentStep={2}
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
  headerSection: {
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    paddingHorizontal: 12,
  },
  heading: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: "center",
    fontWeight: "900",
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
  listSection: {
    width: "100%",
    marginBottom: spacing.md,
  },
  loaderWrapper: {
    width: "100%",
    alignItems: "center",
  },
  bottomSection: {
    width: "100%",
    marginTop: spacing.sm,
    alignItems: "center",
  },
  bottomDots: {
    marginBottom: spacing.lg,
  },
});
