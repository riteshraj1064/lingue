
import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  Circle,
  RoundedRect,
  Shadow,
} from "@shopify/react-native-skia";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  radius,
  shadows,
  typography
} from "../../constant/constant";

import { Confetti } from "../Confetti";
import { Mascot } from "../Mascot";
import { PrimaryButton } from "../PrimaryButton";
import { RewardMysteryBox } from "./RewardMysteryBox";

/* ================================================================
   TYPES
================================================================ */

interface LessonCompleteViewProps {
  xpEarned: number;
  totalQuestions: number;
  accuracy: number;
  timeSpentFormatted: string;
  onContinue: () => void;
  coinsEarned?: number;
  gemsEarned?: number;
}

/* ================================================================
   COLORS
================================================================ */

const COLORS = {
  purple: "#7054F6",
  purpleDark: "#5137D8",

  text: "#17142B",
  muted: "#6E6A80",

  green: "#20C98A",
  greenDark: "#117553",

  red: "#EF646F",
  redDark: "#B43C47",

  gold: "#F5B52F",

  blue: "#4D8DFF",

  white: "#FFFFFF",
};

/* ================================================================
   SKIA BACKGROUND
================================================================ */

const GlassBackground = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  return (
    <Canvas
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {/* Base */}

      <RoundedRect
        x={0}
        y={0}
        width={width}
        height={height}
        r={0}
        color="#F2EFFF"
      />

      {/* Large purple blob */}

      <Circle
        cx={width * 0.92}
        cy={height * 0.14}
        r={width * 0.50}
        color="rgba(112,84,246,0.14)"
      />

      {/* Cyan blob */}

      <Circle
        cx={-width * 0.05}
        cy={height * 0.74}
        r={width * 0.48}
        color="rgba(44,205,220,0.12)"
      />

      {/* Bottom purple */}

      <Circle
        cx={width * 0.78}
        cy={height * 0.92}
        r={width * 0.40}
        color="rgba(112,84,246,0.08)"
      />

      {/* Center light */}

      <Circle
        cx={width * 0.48}
        cy={height * 0.46}
        r={width * 0.36}
        color="rgba(255,255,255,0.28)"
      />

      {/* Gold hero glow */}

      <Circle
        cx={width * 0.50}
        cy={120}
        r={100}
        color="rgba(245,181,47,0.10)"
      />

      {/* Decorative dots */}

      <Circle
        cx={width * 0.10}
        cy={height * 0.25}
        r={5}
        color="rgba(112,84,246,0.22)"
      />

      <Circle
        cx={width * 0.91}
        cy={height * 0.38}
        r={8}
        color="rgba(245,181,47,0.22)"
      />

      <Circle
        cx={width * 0.14}
        cy={height * 0.56}
        r={4}
        color="rgba(32,201,138,0.25)"
      />

      <Circle
        cx={width * 0.88}
        cy={height * 0.72}
        r={5}
        color="rgba(239,100,111,0.20)"
      />
    </Canvas>
  );
};

/* ================================================================
   HERO GLASS
================================================================ */

const HeroGlass = ({
  width,
}: {
  width: number;
}) => {
  const size = Math.min(width * 0.36, 140);

  const x = (width - size) / 2;
  const y = 4;

  const safeRadius = size / 2;

  return (
    <Canvas
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {/* Glow */}

      <Circle
        cx={width / 2}
        cy={y + safeRadius}
        r={size * 0.78}
        color="rgba(245,181,47,0.07)"
      />

      {/* Shadow */}

      <RoundedRect
        x={x}
        y={y + 3}
        width={size}
        height={size}
        r={safeRadius}
        color="rgba(255,255,255,0.10)"
      >
        <Shadow
          dx={0}
          dy={7}
          blur={18}
          color="rgba(112,84,246,0.10)"
        />
      </RoundedRect>

      {/* Glass */}

      <RoundedRect
        x={x}
        y={y}
        width={size}
        height={size}
        r={safeRadius}
        color="rgba(255,255,255,0.13)"
      />

      {/* Inner glass */}

      <RoundedRect
        x={x + 1}
        y={y + 1}
        width={size - 2}
        height={size - 2}
        r={Math.max(safeRadius - 1, 0)}
        color="rgba(255,255,255,0.035)"
      />

      {/* Top reflection */}

      <RoundedRect
        x={x + size * 0.22}
        y={y + 1}
        width={size * 0.56}
        height={2}
        r={1}
        color="rgba(255,255,255,0.70)"
      />

      {/* Border */}

      <RoundedRect
        x={x}
        y={y}
        width={size}
        height={size}
        r={safeRadius}
        color="rgba(255,255,255,0.70)"
        style="stroke"
        strokeWidth={1}
      />
    </Canvas>
  );
};

/* ================================================================
   STAT GLASS
================================================================ */

const StatGlass = ({
  width,
  height,
  accent,
}: {
  width: number;
  height: number;
  accent: string;
}) => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeRadius = Math.min(
    Number(radius.card) || 20,
    safeWidth / 2,
    safeHeight / 2
  );

  return (
    <Canvas
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {/* Shadow */}

      <RoundedRect
        x={0}
        y={2}
        width={safeWidth}
        height={safeHeight}
        r={safeRadius}
        color="rgba(112,84,246,0.035)"
      >
        <Shadow
          dx={0}
          dy={5}
          blur={14}
          color="rgba(65,50,130,0.10)"
        />
      </RoundedRect>

      {/* Main glass */}

      <RoundedRect
        x={0}
        y={0}
        width={safeWidth}
        height={safeHeight}
        r={safeRadius}
        color="rgba(255,255,255,0.125)"
      />

      {/* Inner glass */}

      <RoundedRect
        x={1}
        y={1}
        width={Math.max(1, safeWidth - 2)}
        height={Math.max(1, safeHeight - 2)}
        r={Math.max(0, safeRadius - 1)}
        color="rgba(255,255,255,0.035)"
      />

      {/* Bottom accent */}

      <RoundedRect
        x={safeWidth * 0.22}
        y={Math.max(0, safeHeight - 3)}
        width={safeWidth * 0.56}
        height={2}
        r={1}
        color={accent}
      />

      {/* Top reflection */}

      <RoundedRect
        x={18}
        y={1}
        width={Math.max(1, safeWidth - 36)}
        height={2}
        r={1}
        color="rgba(255,255,255,0.65)"
      />

      {/* Border */}

      <RoundedRect
        x={0}
        y={0}
        width={safeWidth}
        height={safeHeight}
        r={safeRadius}
        color="rgba(255,255,255,0.70)"
        style="stroke"
        strokeWidth={1}
      />
    </Canvas>
  );
};

/* ================================================================
   STAT CARD
================================================================ */

interface StatCardProps {
  width: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  accent: string;
  value: string;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({
  width,
  icon,
  iconColor,
  iconBackground,
  accent,
  value,
  label,
}) => {
  const CARD_HEIGHT = 122;

  return (
    <View
      style={[
        styles.statCard,
        {
          width,
          height: CARD_HEIGHT,
        },
      ]}
    >
      {/* ========================================================
          SKIA GLASS
      ======================================================== */}

      <StatGlass
        width={width}
        height={CARD_HEIGHT}
        accent={accent}
      />

      {/* ========================================================
          CONTENT
      ======================================================== */}

      <View
        style={[
          styles.statIconBg,
          {
            backgroundColor: iconBackground,
            borderColor: `${iconColor}55`,
          },
        ]}
      >
        <View
          style={[
            styles.statIconInner,
            {
              borderColor: `${iconColor}45`,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={iconColor}
          />
        </View>
      </View>

      <Text style={styles.statNumber}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
};

/* ================================================================
   FOOTER GLASS
================================================================ */

const FooterGlass = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  const safeRadius = Math.min(
    Number(radius.card) || 20,
    width / 2,
    height / 2
  );

  return (
    <Canvas
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {/* Shadow */}

      <RoundedRect
        x={0}
        y={2}
        width={width}
        height={height}
        r={safeRadius}
        color="rgba(112,84,246,0.035)"
      >
        <Shadow
          dx={0}
          dy={6}
          blur={15}
          color="rgba(60,45,130,0.10)"
        />
      </RoundedRect>

      {/* Glass */}

      <RoundedRect
        x={0}
        y={0}
        width={width}
        height={height}
        r={safeRadius}
        color="rgba(255,255,255,0.12)"
      />

      {/* Inner surface */}

      <RoundedRect
        x={1}
        y={1}
        width={Math.max(1, width - 2)}
        height={Math.max(1, height - 2)}
        r={Math.max(0, safeRadius - 1)}
        color="rgba(255,255,255,0.035)"
      />

      {/* Reflection */}

      <RoundedRect
        x={20}
        y={1}
        width={Math.max(1, width - 40)}
        height={2}
        r={1}
        color="rgba(255,255,255,0.68)"
      />

      {/* Border */}

      <RoundedRect
        x={0}
        y={0}
        width={width}
        height={height}
        r={safeRadius}
        color="rgba(255,255,255,0.70)"
        style="stroke"
        strokeWidth={1}
      />
    </Canvas>
  );
};

/* ================================================================
   MAIN COMPONENT
================================================================ */

export const LessonCompleteView: React.FC<
  LessonCompleteViewProps
> = ({
  xpEarned = 20,
  totalQuestions = 3,
  accuracy = 100,
  timeSpentFormatted = "1m 24s",
  onContinue,
  coinsEarned,
  gemsEarned,
}) => {
    const { width, height } = useWindowDimensions();
    const [isBoxOpened, setIsBoxOpened] = useState(false);
    const detailsAnim = useRef(new Animated.Value(0)).current;

    const scale = Math.min(
      Math.max(width / 390, 0.9),
      1.08
    );

    const horizontalPadding = 20;
    const columnGap = 12;

    const availableWidth =
      width -
      horizontalPadding * 2 -
      columnGap;

    const statWidth = Math.max(
      1,
      availableWidth / 2
    );

    const footerWidth = Math.max(
      1,
      width - horizontalPadding * 2
    );

    const footerHeight = 82;
    const buttonHeight = 58;

    const handleBoxOpen = () => {
      setIsBoxOpened(true);
      Animated.timing(detailsAnim, {
        toValue: 1,
        duration: 550,
        delay: 350,
        useNativeDriver: true,
      }).start();
    };

    // ─── PHASE 1: UNOPENED (SHOW ONLY THE CENTERED BOX IN THE MIDDLE) ───
    if (!isBoxOpened) {
      return (
        <View style={styles.container}>
          <GlassBackground width={width} height={height} />

          <View style={styles.centeredBoxWrapper}>
            {/* Header info */}
            <View style={styles.centerBoxHeader}>
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: 29 * scale,
                    lineHeight: 35 * scale,
                  },
                ]}
              >
                Lesson Complete!
              </Text>

              <Text style={styles.subtitleCenter}>
                🎁 You unlocked a mystery box! Tap the box to collect your rewards!
              </Text>
            </View>

            {/* Centered Mystery Box in the Middle */}
            <View style={styles.middleBoxContainer}>
              <RewardMysteryBox
                xpEarned={xpEarned}
                coinsEarned={coinsEarned}
                gemsEarned={gemsEarned}
                isOpened={false}
                onOpen={handleBoxOpen}
                width={width}
              />
            </View>

            {/* Bottom Action Button */}
            <View
              style={[
                styles.footer,
                {
                  height: buttonHeight,
                  width: footerWidth,
                  marginTop: 18,
                },
              ]}
            >
              <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
                <RoundedRect
                  x={0}
                  y={3}
                  width={footerWidth}
                  height={buttonHeight - 2}
                  r={Math.min(
                    Number(radius.button) || 20,
                    (buttonHeight - 2) / 2
                  )}
                  color="rgba(112,84,246,0.18)"
                >
                  <Shadow
                    dx={0}
                    dy={5}
                    blur={15}
                    color="rgba(112,84,246,0.22)"
                  />
                </RoundedRect>
              </Canvas>

              <PrimaryButton
                title="Tap Box to Open 🎁"
                onPress={handleBoxOpen}
                size="large"
                style={styles.continueBtn}
              />
            </View>
          </View>
        </View>
      );
    }

    // ─── PHASE 2: AFTER COLLECTING REWARD (SHOW COMPLETE QUIZ DETAILS) ───
    return (
      <View style={styles.container}>
        {/* Skia Background */}
        <GlassBackground
          width={width}
          height={height}
        />

        {/* Confetti Celebration */}
        <View
          pointerEvents="none"
          style={styles.confetti}
        >
          <Confetti />
        </View>

        {/* Scrollable Complete Quiz Details */}
        <ScrollView
          style={styles.scrollWrapper}
          contentContainerStyle={[styles.content, { minHeight: height - 50 }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header with Title & Open Reward Chest */}
          <View style={styles.heroSection}>
            <Text
              style={[
                styles.title,
                {
                  fontSize: 27 * scale,
                  lineHeight: 33 * scale,
                },
              ]}
            >
              Rewards Collected! 🎉
            </Text>

            <Text style={styles.subtitle}>
              Here is your complete lesson summary:
            </Text>

            {/* Open Box with Coins and Gems */}
            <RewardMysteryBox
              xpEarned={xpEarned}
              coinsEarned={coinsEarned}
              gemsEarned={gemsEarned}
              isOpened={true}
              onOpen={handleBoxOpen}
              width={width}
            />
          </View>

          {/* COMPLETE QUIZ DETAILS: STATS GRID */}
          <Animated.View
            style={[
              styles.statsGrid,
              {
                opacity: detailsAnim,
                transform: [
                  {
                    translateY: detailsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <StatCard
              width={statWidth}
              icon="star"
              iconColor={COLORS.gold}
              iconBackground="rgba(245,181,47,0.10)"
              accent="rgba(245,181,47,0.40)"
              value={`+${xpEarned}`}
              label="XP Earned"
            />

            <StatCard
              width={statWidth}
              icon="checkmark-circle"
              iconColor={COLORS.green}
              iconBackground="rgba(32,201,138,0.10)"
              accent="rgba(32,201,138,0.38)"
              value={`${totalQuestions}/${totalQuestions}`}
              label="Questions"
            />

            <StatCard
              width={statWidth}
              icon="disc"
              iconColor={COLORS.red}
              iconBackground="rgba(239,100,111,0.10)"
              accent="rgba(239,100,111,0.38)"
              value={`${accuracy}%`}
              label="Accuracy"
            />

            <StatCard
              width={statWidth}
              icon="time"
              iconColor={COLORS.blue}
              iconBackground="rgba(77,141,255,0.10)"
              accent="rgba(77,141,255,0.38)"
              value={timeSpentFormatted}
              label="Time"
            />
          </Animated.View>

          {/* MASCOT CELEBRATION FOOTER */}
          <Animated.View
            style={[
              styles.footerNoteWrapper,
              {
                width: footerWidth,
                height: footerHeight,
                opacity: detailsAnim,
              },
            ]}
          >
            <FooterGlass
              width={footerWidth}
              height={footerHeight}
            />

            <View style={styles.mascotFooterNote}>
              <View style={styles.footerMascot}>
                <Mascot
                  size={46}
                  pose="celebrating"
                  floating={false}
                />
              </View>

              <View style={styles.footerDivider} />

              <View style={styles.footerNoteText}>
                <Text style={styles.footerNoteTitle}>
                  Amazing Job!
                </Text>

                <Text style={styles.footerNoteSubtitle}>
                  You've collected all rewards & completed this quiz!
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* CONTINUE BUTTON */}
          <View
            style={[
              styles.footer,
              {
                height: buttonHeight,
              },
            ]}
          >
            <Canvas
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            >
              <RoundedRect
                x={0}
                y={3}
                width={footerWidth}
                height={buttonHeight - 2}
                r={Math.min(
                  Number(radius.button) || 20,
                  (buttonHeight - 2) / 2
                )}
                color="rgba(112,84,246,0.18)"
              >
                <Shadow
                  dx={0}
                  dy={5}
                  blur={15}
                  color="rgba(112,84,246,0.22)"
                />
              </RoundedRect>
            </Canvas>

            <PrimaryButton
              title="Continue"
              onPress={onContinue}
              size="large"
              style={styles.continueBtn}
            />
          </View>
        </ScrollView>
      </View>
    );
  };

/* ================================================================
   STYLES
================================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  /* Middle centered box screen */
  centeredBoxWrapper: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 32,
  },

  centerBoxHeader: {
    alignItems: "center",
    width: "100%",
  },

  middleBoxContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  subtitleCenter: {
    ...typography.caption,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
    fontWeight: "600",
    lineHeight: 20,
  },

  /* Complete Quiz details screen */
  scrollWrapper: {
    flex: 1,
    backgroundColor: "transparent",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    justifyContent: "space-between",
  },

  confetti: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },

  /* ============================================================
     HERO
  ============================================================ */

  heroSection: {
    alignItems: "center",
    position: "relative",
    marginTop: 6,
    marginBottom: 6,
  },

  subtitle: {
    ...typography.caption,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 4,
    fontWeight: "600",
  },

  trophyWrapper: {
    width: 140,

    height: 140,

    alignItems: "center",

    justifyContent: "center",

    position: "relative",
  },

  trophyEmoji: {
    textShadowColor:
      "rgba(245,181,47,0.25)",

    textShadowOffset: {
      width: 0,
      height: 3,
    },

    textShadowRadius: 8,
  },

  mascotOverTrophy: {
    position: "absolute",

    top: -24,
  },

  title: {
    ...typography.h1,

    color: COLORS.text,

    textAlign: "center",

    marginTop: 14,

    fontWeight: "900",

    letterSpacing: -0.8,
  },

  /* ============================================================
     STATS
  ============================================================ */

  statsGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    justifyContent: "space-between",

    gap: 12,

    marginVertical: 14,
  },

  statCard: {
    position: "relative",

    alignItems: "center",

    justifyContent: "center",

    overflow: "hidden",

    borderRadius: radius.card,
  },

  statIconBg: {
    width: 38,

    height: 38,

    borderRadius: 19,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 4,

    borderWidth: 1,
  },

  statIconInner: {
    width: 30,

    height: 30,

    borderRadius: 15,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.08)",

    borderWidth: 1,
  },

  statNumber: {
    ...typography.h2,

    color: COLORS.text,

    fontWeight: "900",

    fontSize: 25,

    lineHeight: 31,
  },

  statLabel: {
    ...typography.tiny,

    color: COLORS.muted,

    fontWeight: "800",

    textTransform: "uppercase",

    letterSpacing: 0.5,

    marginTop: 1,
  },

  /* ============================================================
     FOOTER NOTE
  ============================================================ */

  footerNoteWrapper: {
    position: "relative",

    borderRadius: radius.card,

    overflow: "hidden",
  },

  mascotFooterNote: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    paddingVertical: 10,

    paddingHorizontal: 14,

    gap: 12,
  },

  footerMascot: {
    width: 54,

    alignItems: "center",

    justifyContent: "center",
  },

  footerDivider: {
    width: 1,

    height: 42,

    backgroundColor:
      "rgba(112,84,246,0.14)",
  },

  footerNoteText: {
    flex: 1,
  },

  footerNoteTitle: {
    ...typography.body,

    fontWeight: "900",

    color: COLORS.purple,

    fontSize: 19,
  },

  footerNoteSubtitle: {
    ...typography.caption,

    color: COLORS.muted,

    marginTop: 2,
  },

  /* ============================================================
     BUTTON
  ============================================================ */

  footer: {
    width: "100%",

    position: "relative",
  },

  continueBtn: {
    width: "100%",

    height: 58,

    borderRadius: radius.button,

    //@ts-ignore
    ...shadows.buttonPrimary,
  },
});

export default LessonCompleteView;
