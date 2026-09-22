// components/lesson/LessonStartView.tsx

import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Mascot } from "../Mascot";
import { LessonInfo } from "./types";

/* ============================================================
   TYPES
============================================================ */

interface LessonStartViewProps {
  lesson: LessonInfo;
  onStart: () => void;
  onBack: () => void;
  loading?: boolean;
}

/* ============================================================
   COLORS
============================================================ */

const COLORS = {
  background: "#F5F2FF",

  purple: "#6847F5",
  purpleDark: "#5135D4",

  text: "#111126",
  textSecondary: "#626078",
  textMuted: "#77738C",

  green: "#16C58B",
  gold: "#F7B718",

  white: "#FFFFFF",
};

/* ============================================================
   GLASS COMPONENT
============================================================ */

interface GlassProps {
  children: React.ReactNode;
  style?: any;
}

const Glass: React.FC<GlassProps> = ({
  children,
  style,
}) => {
  return (
    <View style={[styles.glass, style]}>
      {/* Frosted base */}
      <View
        pointerEvents="none"
        style={styles.glassBase}
      />

      {/* Soft top reflection */}
      <View
        pointerEvents="none"
        style={styles.glassReflection}
      />

      {/* Top edge */}
      <View
        pointerEvents="none"
        style={styles.glassTopEdge}
      />

      {/* Content */}
      <View style={styles.glassContent}>
        {children}
      </View>
    </View>
  );
};

/* ============================================================
   COMPONENT
============================================================ */

export const LessonStartView: React.FC<
  LessonStartViewProps
> = ({
  lesson,
  onStart,
  onBack,
  loading = false,
}) => {
    const { width, height } = useWindowDimensions();

    /* ==========================================================
       DEVICE SIZE
    ========================================================== */

    const isSmallHeight = height < 760;
    const isVerySmallHeight = height < 700;
    const isNarrow = width < 360;

    const horizontalPadding = width < 350 ? 16 : 20;

    /*
     * Reference design = 390 x 844
     */
    const scale = Math.min(
      Math.max(width / 390, 0.88),
      1.08
    );

    /* ==========================================================
       RESPONSIVE DIMENSIONS
    ========================================================== */

    const heroHeight = isVerySmallHeight
      ? 175
      : isSmallHeight
        ? 198
        : 226;

    const mascotSize = isVerySmallHeight
      ? 120
      : isSmallHeight
        ? 135
        : 150;

    const mascotCircleSize = isVerySmallHeight
      ? 154
      : isSmallHeight
        ? 170
        : 190;

    const titleSize = isVerySmallHeight
      ? 32
      : isSmallHeight
        ? 35
        : isNarrow
          ? 36
          : 40;

    /* ==========================================================
       ANIMATION
    ========================================================== */

    const heroOpacity = useSharedValue(0);
    const heroTranslate = useSharedValue(25);

    const contentOpacity = useSharedValue(0);
    const contentTranslate = useSharedValue(20);

    const footerOpacity = useSharedValue(0);
    const footerTranslate = useSharedValue(20);

    const mascotTranslate = useSharedValue(0);
    const mascotRotation = useSharedValue(0);

    const glowScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.5);

    useEffect(() => {
      /* Hero */

      heroOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });

      heroTranslate.value = withTiming(0, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });

      /* Content */

      contentOpacity.value = withDelay(
        120,
        withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        })
      );

      contentTranslate.value = withDelay(
        120,
        withTiming(0, {
          duration: 550,
          easing: Easing.out(Easing.cubic),
        })
      );

      /* Footer */

      footerOpacity.value = withDelay(
        250,
        withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        })
      );

      footerTranslate.value = withDelay(
        250,
        withTiming(0, {
          duration: 550,
          easing: Easing.out(Easing.cubic),
        })
      );

      /* Mascot floating */

      mascotTranslate.value = withRepeat(
        withSequence(
          withTiming(-5, {
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(5, {
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      );

      /* Mascot rotation */

      mascotRotation.value = withRepeat(
        withSequence(
          withTiming(-1, {
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1, {
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      );

      /* Hero glow */

      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 2300,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1, {
            duration: 2300,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      );

      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.72, {
            duration: 2300,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0.42, {
            duration: 2300,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      );
    }, []);

    /* ==========================================================
       ANIMATED STYLES
    ========================================================== */

    const heroAnimatedStyle =
      useAnimatedStyle(() => ({
        opacity: heroOpacity.value,

        transform: [
          {
            translateY: heroTranslate.value,
          },
        ],
      }));

    const contentAnimatedStyle =
      useAnimatedStyle(() => ({
        opacity: contentOpacity.value,

        transform: [
          {
            translateY: contentTranslate.value,
          },
        ],
      }));

    const footerAnimatedStyle =
      useAnimatedStyle(() => ({
        opacity: footerOpacity.value,

        transform: [
          {
            translateY: footerTranslate.value,
          },
        ],
      }));

    const mascotAnimatedStyle =
      useAnimatedStyle(() => ({
        transform: [
          {
            translateY: mascotTranslate.value,
          },
          {
            rotate: `${mascotRotation.value}deg`,
          },
        ],
      }));

    const glowAnimatedStyle =
      useAnimatedStyle(() => ({
        opacity: glowOpacity.value,

        transform: [
          {
            scale: glowScale.value,
          },
        ],
      }));

    /* ==========================================================
       RENDER
    ========================================================== */

    return (
      <View style={styles.container}>
        {/* ======================================================
          BACKGROUND
      ====================================================== */}

        <Canvas
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* Base */}

          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width, height)}
              colors={[
                "#F5F2FF",
                "#F0EDFF",
                "#F8F8FF",
                "#EEF9F7",
              ]}
            />
          </Rect>

          {/* Large top-right lavender shape */}

          <Circle
            cx={width * 0.88}
            cy={height * 0.13}
            r={width * 0.57}
            color="rgba(111,82,245,0.13)"
          />

          {/* Large lower-left blue shape */}

          <Circle
            cx={-width * 0.05}
            cy={height * 0.78}
            r={width * 0.55}
            color="rgba(61,205,226,0.12)"
          />

          {/* Bottom lavender */}

          <Circle
            cx={width * 0.80}
            cy={height * 0.94}
            r={width * 0.46}
            color="rgba(112,87,245,0.08)"
          />

          {/* Center white glow */}

          <Circle
            cx={width * 0.50}
            cy={height * 0.47}
            r={width * 0.37}
            color="rgba(255,255,255,0.30)"
          />

          {/* Decorative dots */}

          <Circle
            cx={width * 0.11}
            cy={height * 0.29}
            r={6}
            color="rgba(112,84,246,0.20)"
          />

          <Circle
            cx={width * 0.91}
            cy={height * 0.37}
            r={9}
            color="rgba(245,181,47,0.19)"
          />

          <Circle
            cx={width * 0.14}
            cy={height * 0.55}
            r={5}
            color="rgba(32,201,138,0.23)"
          />

          <Circle
            cx={width * 0.84}
            cy={height * 0.53}
            r={6}
            color="rgba(112,84,246,0.14)"
          />
        </Canvas>

        <SafeAreaView
          style={styles.safeArea}
          edges={["top", "bottom"]}
        >
          {/* ====================================================
            HEADER
        ==================================================== */}

          <View style={styles.header}>
            {/* Back */}

            <TouchableOpacity
              onPress={onBack}
              disabled={loading}
              activeOpacity={0.75}
              style={styles.headerCircle}
            >
              <View
                pointerEvents="none"
                style={styles.smallGlassBase}
              />

              <Ionicons
                name="arrow-back"
                size={27}
                color={COLORS.text}
              />
            </TouchableOpacity>

            {/* Unit title */}

            <View style={styles.headerTitle}>
              <View
                pointerEvents="none"
                style={styles.headerTitleBase}
              />

              <View
                pointerEvents="none"
                style={styles.headerTitleTop}
              />

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={styles.headerTitleText}
              >
                {lesson.unitTitle}
              </Text>
            </View>

            {/* Settings */}

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.headerCircle}
            >
              <View
                pointerEvents="none"
                style={styles.smallGlassBase}
              />

              <Ionicons
                name="settings"
                size={24}
                color="#737087"
              />
            </TouchableOpacity>
          </View>

          {/* ====================================================
            MAIN CONTENT
        ==================================================== */}

          <View
            style={[
              styles.main,
              {
                paddingHorizontal:
                  horizontalPadding,
              },
            ]}
          >
            {/* ==================================================
              HERO
          ================================================== */}

            <Animated.View
              style={[
                styles.hero,
                {
                  height: heroHeight,
                },
                heroAnimatedStyle,
              ]}
            >
              {/* Glow */}

              <Animated.View
                style={[
                  styles.mascotGlow,
                  {
                    width:
                      mascotCircleSize + 14,
                    height:
                      mascotCircleSize + 14,
                    borderRadius:
                      (mascotCircleSize + 14) /
                      2,
                  },
                  glowAnimatedStyle,
                ]}
              />

              {/* Main glass circle */}

              <View
                style={[
                  styles.mascotCircle,
                  {
                    width: mascotCircleSize,
                    height: mascotCircleSize,
                    borderRadius:
                      mascotCircleSize / 2,
                  },
                ]}
              >
                <View
                  pointerEvents="none"
                  style={styles.mascotCircleBase}
                />

                <View
                  pointerEvents="none"
                  style={styles.mascotCircleReflection}
                />

                <View
                  pointerEvents="none"
                  style={styles.mascotCircleBorder}
                />
              </View>

              {/* Mascot */}

              <Animated.View
                style={mascotAnimatedStyle}
              >
                <Mascot
                  size={mascotSize}
                  pose="celebrating"
                  floating={false}
                />
              </Animated.View>

              {/* Sparkle */}

              <View
                style={[
                  styles.sparkle,
                  {
                    width: 46 * scale,
                    height: 46 * scale,
                    borderRadius: 23 * scale,
                    right: width * 0.22,
                    top: isSmallHeight
                      ? 24
                      : 35,
                  },
                ]}
              >
                <View
                  pointerEvents="none"
                  style={styles.sparkleBase}
                />

                <Ionicons
                  name="sparkles"
                  size={21}
                  color={COLORS.gold}
                />
              </View>

              {/* Lesson badge */}

              <Glass
                style={[
                  styles.lessonBadge,
                  {
                    left: 0,
                    top: isSmallHeight
                      ? 55
                      : 68,
                  },
                ]}
              >
                <View
                  style={styles.badgeContent}
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={COLORS.purple}
                  />

                  <Text
                    style={
                      styles.lessonBadgeText
                    }
                  >
                    LESSON
                  </Text>
                </View>
              </Glass>

              {/* XP badge */}

              <Glass
                style={[
                  styles.xpBadge,
                  {
                    right: 0,
                    top: isSmallHeight
                      ? 8
                      : 18,
                  },
                ]}
              >
                <View
                  style={styles.badgeContent}
                >
                  <View style={styles.xpCircle}>
                    <Ionicons
                      name="flash"
                      size={15}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text
                    style={styles.xpText}
                  >
                    +{lesson.xpReward} XP
                  </Text>
                </View>
              </Glass>
            </Animated.View>

            {/* ==================================================
              TITLE
          ================================================== */}

            <Animated.View
              style={[
                styles.titleSection,
                contentAnimatedStyle,
              ]}
            >
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                style={[
                  styles.lessonTitle,
                  {
                    fontSize: titleSize,
                    lineHeight:
                      titleSize + 5,
                  },
                ]}
              >
                {lesson.lessonTitle}
              </Text>

              <Text
                numberOfLines={2}
                style={styles.lessonDescription}
              >
                {lesson.description}
              </Text>
            </Animated.View>

            {/* ==================================================
              STATISTICS
          ================================================== */}

            <Animated.View
              style={[
                styles.statsWrapper,
                {
                  marginTop: isSmallHeight
                    ? 13
                    : 18,
                },
                contentAnimatedStyle,
              ]}
            >
              <Glass
                style={styles.statsCard}
              >
                <View
                  style={styles.statsRow}
                >
                  {/* Questions */}

                  <View style={styles.stat}>
                    <View
                      style={[
                        styles.statIcon,
                        styles.questionIcon,
                      ]}
                    >
                      <Ionicons
                        name="help"
                        size={20}
                        color={COLORS.purple}
                      />
                    </View>

                    <Text
                      style={styles.statValue}
                    >
                      {lesson.totalQuestions}
                    </Text>

                    <Text
                      style={styles.statLabel}
                    >
                      Questions
                    </Text>
                  </View>

                  <View
                    style={styles.statDivider}
                  />

                  {/* Minutes */}

                  <View style={styles.stat}>
                    <View
                      style={[
                        styles.statIcon,
                        styles.minuteIcon,
                      ]}
                    >
                      <Ionicons
                        name="time"
                        size={20}
                        color={COLORS.green}
                      />
                    </View>

                    <Text
                      style={styles.statValue}
                    >
                      {lesson.estimatedMinutes}
                    </Text>

                    <Text
                      style={styles.statLabel}
                    >
                      Minutes
                    </Text>
                  </View>

                  <View
                    style={styles.statDivider}
                  />

                  {/* XP */}

                  <View style={styles.stat}>
                    <View
                      style={[
                        styles.statIcon,
                        styles.xpIcon,
                      ]}
                    >
                      <Ionicons
                        name="star"
                        size={19}
                        color={COLORS.gold}
                      />
                    </View>

                    <Text
                      style={styles.statValue}
                    >
                      {lesson.xpReward}
                    </Text>

                    <Text
                      style={styles.statLabel}
                    >
                      XP Reward
                    </Text>
                  </View>
                </View>
              </Glass>
            </Animated.View>

            {/* ==================================================
              READY CARD
          ================================================== */}

            <Animated.View
              style={[
                styles.readyWrapper,
                {
                  marginTop: isSmallHeight
                    ? 10
                    : 14,
                },
                contentAnimatedStyle,
              ]}
            >
              <Glass
                style={styles.readyCard}
              >
                <View style={styles.readyRow}>
                  {/* Icon */}

                  <View
                    style={styles.readyIcon}
                  >
                    <View
                      pointerEvents="none"
                      style={styles.readyIconBase}
                    />

                    <Ionicons
                      name="sparkles"
                      size={22}
                      color={COLORS.purple}
                    />
                  </View>

                  {/* Content */}

                  <View
                    style={styles.readyContent}
                  >
                    <Text
                      numberOfLines={1}
                      style={styles.readyTitle}
                    >
                      Ready to learn?
                    </Text>

                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      style={styles.readyDescription}
                    >
                      Complete this lesson and earn{" "}
                      {lesson.xpReward} XP.
                    </Text>
                  </View>

                  {/* Arrow */}

                  <View
                    style={styles.readyArrow}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={23}
                      color="#6D6A80"
                    />
                  </View>
                </View>
              </Glass>
            </Animated.View>

            {/* Flexible space */}

            <View style={styles.flexSpace} />
          </View>

          {/* ====================================================
            START BUTTON
        ==================================================== */}

          <Animated.View
            style={[
              styles.footer,
              {
                paddingHorizontal:
                  horizontalPadding,
              },
              footerAnimatedStyle,
            ]}
          >
            <TouchableOpacity
              onPress={onStart}
              disabled={loading}
              activeOpacity={0.78}
              style={[
                styles.startButton,
                loading &&
                styles.startButtonDisabled,
              ]}
            >
              {/* Glass base */}

              <View
                pointerEvents="none"
                style={styles.startBase}
              />

              {/* Top reflection */}

              <View
                pointerEvents="none"
                style={styles.startReflection}
              />

              {/* Neutral inner highlight */}

              <View
                pointerEvents="none"
                style={styles.startHighlight}
              />

              {/* Border */}

              <View
                pointerEvents="none"
                style={styles.startBorder}
              />

              <View
                style={styles.startContent}
              >
                {loading ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={COLORS.purple}
                    />

                    <Text
                      style={styles.startText}
                    >
                      Starting...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={styles.startText}
                    >
                      Start Lesson
                    </Text>

                    <View
                      style={styles.startArrow}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={25}
                        color={COLORS.purple}
                      />
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <Text
              style={styles.footerHint}
            >
              You can pause anytime
            </Text>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  };

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  /* ==========================================================
     ROOT
  ========================================================== */

  container: {
    flex: 1,

    backgroundColor:
      COLORS.background,
  },

  safeArea: {
    flex: 1,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    height: 72,

    paddingHorizontal: 20,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    zIndex: 20,
  },

  headerCircle: {
    width: 52,

    height: 52,

    borderRadius: 26,

    overflow: "hidden",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(238,235,248,0.30)",

    borderWidth: 1.3,

    borderColor:
      "rgba(255,255,255,0.82)",

    elevation: 0,
  },

  smallGlassBase: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.10)",
  },

  headerTitle: {
    position: "absolute",

    left: 76,

    right: 76,

    height: 50,

    borderRadius: 25,

    overflow: "hidden",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(238,235,248,0.28)",

    borderWidth: 1.3,

    borderColor:
      "rgba(255,255,255,0.78)",
  },

  headerTitleBase: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  headerTitleTop: {
    position: "absolute",

    top: 0,

    left: 1,

    right: 1,

    height: 17,

    backgroundColor:
      "rgba(255,255,255,0.14)",
  },

  headerTitleText: {
    fontSize: 17,

    fontWeight: "800",

    color: COLORS.text,

    letterSpacing: -0.2,
  },

  /* ==========================================================
     MAIN
  ========================================================== */

  main: {
    flex: 1,
  },

  /* ==========================================================
     HERO
  ========================================================== */

  hero: {
    width: "100%",

    position: "relative",

    alignItems: "center",

    justifyContent: "center",
  },

  mascotGlow: {
    position: "absolute",

    backgroundColor:
      "rgba(111,82,245,0.09)",

    shadowColor:
      COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 0,
    },

    shadowOpacity: 0.20,

    shadowRadius: 35,

    elevation: 0,
  },

  mascotCircle: {
    position: "absolute",

    overflow: "hidden",

    backgroundColor:
      "rgba(239,236,249,0.22)",

    borderWidth: 1.4,

    borderColor:
      "rgba(255,255,255,0.86)",
  },

  mascotCircleBase: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.075)",
  },

  mascotCircleReflection: {
    position: "absolute",

    top: 0,

    left: 0,

    right: 0,

    height: "35%",

    backgroundColor:
      "rgba(255,255,255,0.16)",
  },

  mascotCircleBorder: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    borderWidth: 1,

    borderColor:
      "rgba(150,143,175,0.10)",
  },

  /* ==========================================================
     SPARKLE
  ========================================================== */

  sparkle: {
    position: "absolute",

    overflow: "hidden",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(239,236,249,0.30)",

    borderWidth: 1.2,

    borderColor:
      "rgba(255,255,255,0.84)",
  },

  sparkleBase: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.12)",
  },

  /* ==========================================================
     BADGES
  ========================================================== */

  lessonBadge: {
    position: "absolute",

    width: 108,

    height: 40,

    borderRadius: 20,

    backgroundColor:
      "rgba(239,236,249,0.28)",
  },

  xpBadge: {
    position: "absolute",

    width: 122,

    height: 45,

    borderRadius: 23,

    backgroundColor:
      "rgba(239,236,249,0.28)",
  },

  badgeContent: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",
  },

  lessonBadgeText: {
    marginLeft: 6,

    fontSize: 12,

    fontWeight: "900",

    letterSpacing: 0.5,

    color: COLORS.purple,
  },

  xpCircle: {
    width: 29,

    height: 29,

    borderRadius: 15,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      COLORS.gold,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.85)",
  },

  xpText: {
    marginLeft: 7,

    fontSize: 13,

    fontWeight: "900",

    color: COLORS.text,
  },

  /* ==========================================================
     TITLE
  ========================================================== */

  titleSection: {
    alignItems: "center",

    paddingHorizontal: 5,
  },

  lessonTitle: {
    fontWeight: "900",

    letterSpacing: -1.5,

    color: COLORS.text,

    textAlign: "center",
  },

  lessonDescription: {
    marginTop: 6,

    fontSize: 16,

    lineHeight: 22,

    fontWeight: "500",

    color: COLORS.textSecondary,

    textAlign: "center",
  },

  /* ==========================================================
     GLASS
  ========================================================== */

  glass: {
    position: "relative",

    overflow: "hidden",

    backgroundColor:
      "rgba(239,236,249,0.28)",

    borderWidth: 1.2,

    borderColor:
      "rgba(255,255,255,0.82)",

    elevation: 0,
  },

  glassBase: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(229,226,243,0.12)",
  },

  glassReflection: {
    position: "absolute",

    top: 0,

    left: 0,

    right: 0,

    height: 21,

    backgroundColor:
      "rgba(255,255,255,0.13)",

    zIndex: 1,
  },

  glassTopEdge: {
    position: "absolute",

    top: 1,

    left: 2,

    right: 2,

    height: 1,

    backgroundColor:
      "rgba(255,255,255,0.82)",

    zIndex: 2,
  },

  glassContent: {
    flex: 1,

    position: "relative",

    zIndex: 5,
  },

  /* ==========================================================
     STATS
  ========================================================== */

  statsWrapper: {
    width: "100%",
  },

  statsCard: {
    height: 116,

    borderRadius: 29,
  },

  statsRow: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-evenly",

    paddingHorizontal: 7,
  },

  stat: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",
  },

  statIcon: {
    width: 43,

    height: 43,

    borderRadius: 15,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 5,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.70)",
  },

  questionIcon: {
    backgroundColor:
      "rgba(112,84,246,0.10)",
  },

  minuteIcon: {
    backgroundColor:
      "rgba(32,201,138,0.10)",
  },

  xpIcon: {
    backgroundColor:
      "rgba(245,181,47,0.11)",
  },

  statValue: {
    fontSize: 20,

    lineHeight: 23,

    fontWeight: "900",

    color: COLORS.text,
  },

  statLabel: {
    marginTop: 2,

    fontSize: 10.5,

    fontWeight: "600",

    color: COLORS.textSecondary,
  },

  statDivider: {
    width: 1,

    height: 53,

    backgroundColor:
      "rgba(255,255,255,0.62)",
  },

  /* ==========================================================
     READY CARD
  ========================================================== */

  readyWrapper: {
    width: "100%",
  },

  readyCard: {
    height: 86,

    borderRadius: 26,
  },

  readyRow: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 14,
  },

  readyIcon: {
    width: 50,

    height: 50,

    borderRadius: 17,

    overflow: "hidden",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 13,

    backgroundColor:
      "rgba(239,236,249,0.25)",

    borderWidth: 1.3,

    borderColor:
      "rgba(255,255,255,0.78)",
  },

  readyIconBase: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.10)",
  },

  readyContent: {
    flex: 1,

    minWidth: 0,
  },

  readyTitle: {
    fontSize: 17,

    fontWeight: "900",

    color: COLORS.text,
  },

  readyDescription: {
    marginTop: 2,

    fontSize: 12.5,

    lineHeight: 18,

    fontWeight: "500",

    color: COLORS.textSecondary,
  },

  readyArrow: {
    width: 43,

    height: 43,

    borderRadius: 22,

    marginLeft: 8,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.48)",

    borderWidth: 1.2,

    borderColor:
      "rgba(255,255,255,0.80)",

    elevation: 0,
  },

  /* ==========================================================
     FLEX
  ========================================================== */

  flexSpace: {
    flex: 1,

    minHeight: 5,
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    paddingTop: 7,

    paddingBottom: 5,
  },

  /* ==========================================================
     START BUTTON
     
     NO PURPLE BACKGROUND.
  ========================================================== */

  startButton: {
    height: 72,

    borderRadius: 36,

    overflow: "hidden",

    position: "relative",

    /*
     * Neutral glass.
     *
     * NOT purple.
     */
    backgroundColor:
      "rgba(239,236,249,0.28)",

    borderWidth: 1.3,

    borderColor:
      "rgba(255,255,255,0.90)",

    /*
     * Important Android fix.
     */
    elevation: 0,

    shadowOpacity: 0,
  },

  startBase: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    /*
     * Neutral frosted glass.
     *
     * No purple here.
     */
    backgroundColor:
      "rgba(231,228,244,0.14)",
  },

  startReflection: {
    position: "absolute",

    top: 1,

    left: 1,

    right: 1,

    height: 25,

    borderTopLeftRadius: 35,

    borderTopRightRadius: 35,

    backgroundColor:
      "rgba(255,255,255,0.16)",
  },

  startHighlight: {
    position: "absolute",

    left: 25,

    right: 25,

    bottom: 7,

    height: 8,

    borderRadius: 8,

    backgroundColor:
      "rgba(255,255,255,0.11)",
  },

  startBorder: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    borderRadius: 36,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.48)",
  },

  startContent: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    zIndex: 10,
  },

  startText: {
    fontSize: 19,

    fontWeight: "900",

    color: COLORS.purple,

    letterSpacing: -0.3,
  },

  startArrow: {
    width: 52,

    height: 52,

    borderRadius: 26,

    marginLeft: 16,

    alignItems: "center",

    justifyContent: "center",

    /*
     * White glass circle.
     */
    backgroundColor:
      "rgba(255,255,255,0.68)",

    borderWidth: 1.2,

    borderColor:
      "rgba(255,255,255,0.95)",

    elevation: 0,
  },

  startButtonDisabled: {
    opacity: 0.55,
  },

  footerHint: {
    marginTop: 8,

    textAlign: "center",

    fontSize: 12,

    fontWeight: "600",

    color:
      "rgba(75,70,100,0.58)",
  },
});

export default LessonStartView;