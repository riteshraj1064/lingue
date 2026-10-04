// app/(onboarding)/native-lang.tsx
// SCREEN 7 — NATIVE LANGUAGE
import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GameLoader } from "../../components/GameLoader";
import { Header } from "../../components/Header";
import { LanguageCard } from "../../components/LanguageCard";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ProgressIndicator } from "../../components/ProgressIndicator";
import { ScreenContainer } from "../../components/ScreenContainer";
import {
  colors,
  codeToFlag,
  radius,
  spacing,
  typography,
} from "../../constant/constant";
import { useApp } from "../../context/AppContext";

export default function NativeLanguageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ languages?: string }>();

  const {
    selectedNativeLang,
    setNativeLanguage,
    selectedTargetLang,
    setTargetLanguage,
  } = useApp();

  const [showNativeDropdown, setShowNativeDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [targetLanguages, setTargetLanguages] = useState<any[]>([]);
  const [nativeLanguages, setNativeLanguages] = useState<any[]>([]);

  useEffect(() => {
    // Parse target languages from params if available
    if (params.languages) {
      try {
        const parsed = JSON.parse(params.languages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTargetLanguages(parsed.map((l: any) => ({ ...l, flag: codeToFlag(l.flag) })));
        }
      } catch (e) {
        console.error("Error parsing target languages param:", e);
      }
    }

    const fetchData = async () => {
      setIsLoading(true);

      // Fetch Native Languages from Supabase
      const { data: nativeData, error: nativeError } = await supabase
        .from("native_languages")
        .select("*");

      if (nativeError) {
        console.error("Error fetching native languages:", nativeError);
      } else if (nativeData && nativeData.length > 0) {
        const normalized = nativeData.map((l: any) => ({ ...l, flag: codeToFlag(l.flag) }));
        setNativeLanguages(normalized);
        // Set default native language if not selected or invalid
        if (!selectedNativeLang || !normalized.some((l) => l.id === selectedNativeLang.id)) {
          setNativeLanguage(normalized[0]);
        }
      }

      // If target languages was not passed via params, fetch from Supabase
      if (!params.languages) {
        const { data: targetData } = await supabase
          .from("target_languages")
          .select("*");
        if (targetData && targetData.length > 0) {
          setTargetLanguages(targetData.map((l: any) => ({ ...l, flag: codeToFlag(l.flag) })));
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [params.languages]);

  const handleContinue = async () => {
    router.push("/(onboarding)/course-details");
  };

  return (
    <ScreenContainer scrollable={true} withBottomPadding={true}>
      <Header
        showBack={true}
        onBack={() => router.push("/(onboarding)/courses")}
        transparent={true}
        centerComponent={<ProgressIndicator currentStep={3} totalSteps={4} />}
      />

      {/* Native Language Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.heading}>I speak</Text>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <GameLoader variant="inline" message="Finding your native language... 🗣️" />
          <GameLoader variant="cards" cardCount={2} />
        </View>
      ) : (
        <>
          {/* Primary Native Language Selector Glass Card */}
          <TouchableOpacity
            style={styles.nativeCard}
            onPress={() => setShowNativeDropdown(!showNativeDropdown)}
            activeOpacity={0.8}
          >
            <View pointerEvents="none" style={styles.glassTopEdge} />
            <View style={styles.nativeLeft}>
              <View style={styles.flagPod}>
                <Text style={styles.nativeFlag}>{selectedNativeLang?.flag || "🌐"}</Text>
              </View>
              <View>
                <Text style={styles.nativeName}>{selectedNativeLang?.name || "Select language"}</Text>
                {selectedNativeLang?.nativeName ? (
                  <Text style={styles.nativeSubtitle}>{selectedNativeLang.nativeName}</Text>
                ) : null}
              </View>
            </View>

            <Ionicons
              name={showNativeDropdown ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Dropdown Options if expanded */}
          {showNativeDropdown && (
            <View style={styles.dropdownContainer}>
              <View pointerEvents="none" style={styles.glassTopEdge} />
              {nativeLanguages.map((lang) => (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.dropdownItem,
                    selectedNativeLang?.id === lang.id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setNativeLanguage(lang);
                    setShowNativeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownFlag}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.dropdownText,
                      selectedNativeLang?.id === lang.id && styles.dropdownTextSelected,
                    ]}
                  >
                    {lang.name} {lang.nativeName ? `(${lang.nativeName})` : ""}
                  </Text>
                  {selectedNativeLang?.id === lang.id ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Target Language Grid Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.subHeading}>I want to learn</Text>
          </View>

          <View style={styles.gridContainer}>
            {targetLanguages.map((lang) => (
              <LanguageCard
                key={lang.id}
                language={lang}
                variant="grid"
                selected={selectedTargetLang?.id === lang.id}
                onPress={(item) => setTargetLanguage(item)}
              />
            ))}
          </View>
        </>
      )}

      {/* Bottom Sticky Action Area */}
      <View style={styles.bottomSection}>
        <ProgressIndicator
          currentStep={3}
          totalSteps={4}
          style={styles.bottomDots}
        />
        <PrimaryButton
          title="Continue"
          size="large"
          onPress={handleContinue}
          disabled={isLoading}
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
  sectionHeader: {
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  heading: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: "center",
    fontWeight: "900",
  },
  subHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.md,
    fontWeight: "800",
  },
  loaderContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  nativeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.card,
    backgroundColor: "rgba(104,71,245,0.04)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.16)",
    marginBottom: spacing.sm,
    position: "relative",
    overflow: "hidden",
  },
  nativeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flagPod: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  nativeFlag: {
    fontSize: 24,
  },
  nativeName: {
    ...typography.bodyLarge,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  nativeSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  dropdownContainer: {
    backgroundColor: "rgba(245,242,255,0.92)",
    borderRadius: radius.card,
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.20)",
    padding: 6,
    marginBottom: spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(104,71,245,0.12)",
  },
  dropdownFlag: {
    fontSize: 20,
    marginRight: 10,
  },
  dropdownText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: "600",
  },
  dropdownTextSelected: {
    color: colors.primary,
    fontWeight: "800",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
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
