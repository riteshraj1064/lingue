// app/splash.tsx
// SCREEN 1 — SPLASH
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Mascot } from "../components/Mascot";
import { ScreenContainer } from "../components/ScreenContainer";
import { colors, radius, typography } from "../constant/constant";
import { useApp } from "../context/AppContext";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, selectedCourse } = useApp();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const cloud1Anim = useRef(new Animated.Value(0)).current;
  const cloud2Anim = useRef(new Animated.Value(0)).current;
  const starPulseAnim = useRef(new Animated.Value(1)).current;

  const isAuthRef = useRef(isAuthenticated);
  const courseRef = useRef(selectedCourse);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => {
    isAuthRef.current = isAuthenticated;
    courseRef.current = selectedCourse;
    isLoadingRef.current = isLoading;
  }, [isAuthenticated, selectedCourse, isLoading]);

  useEffect(() => {
    // Cloud animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(cloud1Anim, {
          toValue: 15,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(cloud1Anim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Star pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(starPulseAnim, {
          toValue: 1.2,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(starPulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Progress loading bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2200,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start(() => {
      handleComplete();
    });
  }, []);

  const handleComplete = () => {
    const isAuth = isAuthRef.current;
    const course = courseRef.current;

    if (!isAuth) {
      router.replace("/(auth)/login");
    } else if (isAuth && course) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(onboarding)/welcome");
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <ScreenContainer
      scrollable={false}
      backgroundColor={colors.splashBackground}
      withBottomPadding={false}
      edges={["top", "bottom"]}
    >
      <StatusBar style="light" />

      {/* Decorative Background Elements */}
      <Animated.View
        style={[
          styles.cloudTopLeft,
          { transform: [{ translateX: cloud1Anim }] },
        ]}
      >
        <View style={styles.cloudBubble1} />
        <View style={styles.cloudBubble2} />
      </Animated.View>

      <Animated.View
        style={[
          styles.cloudTopRight,
          { transform: [{ translateX: cloud2Anim }] },
        ]}
      >
        <View style={styles.cloudBubble3} />
      </Animated.View>

      {/* Floating Language & Star Symbols */}
      <Animated.Text
        style={[
          styles.floatingSymbol,
          styles.symbolA,
          { transform: [{ scale: starPulseAnim }] },
        ]}
      >
        ✨
      </Animated.Text>
      <Text style={[styles.floatingSymbol, styles.symbolLang1]}>文</Text>
      <Text style={[styles.floatingSymbol, styles.symbolLang2]}>A</Text>
      <Text style={[styles.floatingSymbol, styles.symbolLang3]}>あ</Text>
      <Text style={[styles.floatingSymbol, styles.symbolStar2]}>⭐</Text>

      {/* Main Branded Center */}
      <View style={styles.contentContainer}>
        <View style={styles.brandHeader}>
          <Text style={styles.logoTitle}>Lingua</Text>
          <Text style={styles.tagline}>Learn languages.{"\n"}Have fun. Get better.</Text>
        </View>

        <View style={styles.mascotSection}>
          <Mascot size="splash" pose="happy" floating={true} />
        </View>

        {/* Bottom Loading Indicator */}
        <TouchableOpacity
          style={styles.bottomSection}
          activeOpacity={0.9}
          onPress={handleComplete}
        >
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressWidth },
              ]}
            />
          </View>
          <Text style={styles.loadingText}>Getting things ready...</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 32,
    zIndex: 10,
  },
  brandHeader: {
    alignItems: "center",
    marginTop: 20,
  },
  logoTitle: {
    ...typography.display,
    fontSize: 42,
    lineHeight: 48,
    color: colors.white,
    letterSpacing: 0.5,
  },
  tagline: {
    ...typography.bodyLarge,
    color: "rgba(255, 255, 255, 0.88)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
  mascotSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  bottomSection: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  progressBarContainer: {
    width: 180,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: radius.pill,
  },
  loadingText: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 12,
    fontWeight: "600",
  },

  // Floating shapes
  cloudTopLeft: {
    position: "absolute",
    top: 40,
    left: -20,
    opacity: 0.2,
  },
  cloudBubble1: {
    width: 120,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
  },
  cloudBubble2: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    marginTop: -40,
    marginLeft: 30,
  },
  cloudTopRight: {
    position: "absolute",
    top: 90,
    right: -30,
    opacity: 0.15,
  },
  cloudBubble3: {
    width: 140,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.white,
  },
  floatingSymbol: {
    position: "absolute",
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "800",
  },
  symbolA: {
    top: 120,
    left: 40,
    fontSize: 22,
  },
  symbolLang1: {
    top: 190,
    right: 45,
    fontSize: 26,
    color: "rgba(255, 255, 255, 0.28)",
  },
  symbolLang2: {
    bottom: 220,
    left: 35,
    fontSize: 24,
    color: "rgba(255, 255, 255, 0.28)",
  },
  symbolLang3: {
    bottom: 260,
    right: 40,
    fontSize: 22,
    color: "rgba(255, 255, 255, 0.28)",
  },
  symbolStar2: {
    top: 280,
    left: 50,
    fontSize: 16,
    opacity: 0.6,
  },
});
