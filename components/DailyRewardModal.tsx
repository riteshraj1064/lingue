import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BlurView } from "expo-blur";

import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  Canvas,
  Circle,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  radius,
  typography
} from "../constant/constant";

import { Confetti } from "./Confetti";
import { Mascot } from "./Mascot";
import { PrimaryButton } from "./PrimaryButton";

/* =========================================================
   TYPES
========================================================= */

interface DailyRewardModalProps {
  visible: boolean;
  onClose: () => void;
  onClaim: () => Promise<void> | void;
  rewardXp?: number;
  rewardGems?: number;
  streakCount?: number;
}

/* =========================================================
   CONFIG
========================================================= */

const SPRING = {
  damping: 18,
  stiffness: 170,
  mass: 0.75,
};

const CARD_WIDTH = 370;
const CARD_RADIUS = 32;

/* =========================================================
   GLASS BACKGROUND
========================================================= */

const GlassBackground = () => {
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {/* Native blur */}
      <BlurView
        intensity={80}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      {/* Skia glass layers */}
      <Canvas
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* Main glass */}
        <RoundedRect
          x={0}
          y={0}
          width={CARD_WIDTH}
          height={620}
          r={CARD_RADIUS}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, 620)}
            colors={[
              "rgba(255,255,255,0.24)",
              "rgba(255,255,255,0.11)",
              "rgba(255,255,255,0.07)",
            ]}
          />
        </RoundedRect>

        {/* Top glow */}
        <RoundedRect
          x={1}
          y={1}
          width={CARD_WIDTH - 2}
          height={170}
          r={CARD_RADIUS}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, 170)}
            colors={[
              "rgba(255,255,255,0.28)",
              "rgba(255,255,255,0)",
            ]}
          />
        </RoundedRect>

        {/* Soft purple glow */}
        <Circle
          cx={CARD_WIDTH - 15}
          cy={70}
          r={105}
          color="rgba(150,120,255,0.10)"
        />

        {/* Soft gold glow */}
        <Circle
          cx={25}
          cy={210}
          r={80}
          color="rgba(255,205,80,0.08)"
        />
      </Canvas>

      {/* Inner white reflection */}
      <View style={styles.glassReflection} />

      {/* Glass border */}
      <View style={styles.glassBorder} />
    </View>
  );
};

/* =========================================================
   ANIMATED REWARD CARD
========================================================= */

const RewardCard = ({
  icon,
  iconColor,
  iconBackground,
  value,
  label,
  index,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  value: string;
  label: string;
  index: number;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      250 + index * 100,
      withSpring(1, SPRING)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,

      transform: [
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [25, 0]
          ),
        },
        {
          scale: interpolate(
            progress.value,
            [0, 1],
            [0.85, 1]
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.rewardCardWrapper,
        animatedStyle,
      ]}
    >
      <View style={styles.rewardCard}>
        <BlurView
          intensity={25}
          tint="light"
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.rewardCardTint} />

        <View
          style={[
            styles.rewardIconBg,
            {
              backgroundColor: iconBackground,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={23}
            color={iconColor}
          />
        </View>

        <Text style={styles.rewardValue}>
          {value}
        </Text>

        <Text style={styles.rewardLabel}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export const DailyRewardModal: React.FC<
  DailyRewardModalProps
> = ({
  visible,
  onClose,
  onClaim,
  rewardXp = 25,
  rewardGems = 1,
  streakCount = 1,
}) => {
    const insets = useSafeAreaInsets();

    const [claiming, setClaiming] =
      useState(false);

    const [claimed, setClaimed] =
      useState(false);

    /* =======================================================
       MAIN ANIMATION
    ======================================================= */

    const progress = useSharedValue(0);

    /* =======================================================
       MASCOT FLOAT
    ======================================================= */

    const mascotFloat = useSharedValue(0);

    /* =======================================================
       BADGE ANIMATION
    ======================================================= */

    const badgeProgress = useSharedValue(0);

    /* =======================================================
       BUTTON PULSE
    ======================================================= */

    const buttonPulse = useSharedValue(1);

    /* =======================================================
       OPEN / CLOSE
    ======================================================= */

    useEffect(() => {
      if (visible) {
        setClaimed(false);
        setClaiming(false);

        progress.value = 0;

        progress.value = withSpring(
          1,
          SPRING
        );

        badgeProgress.value = 0;

        badgeProgress.value = withDelay(
          180,
          withSpring(1, SPRING)
        );

        mascotFloat.value = withRepeat(
          withSequence(
            withTiming(-5, {
              duration: 1200,
              easing: Easing.inOut(
                Easing.ease
              ),
            }),

            withTiming(0, {
              duration: 1200,
              easing: Easing.inOut(
                Easing.ease
              ),
            })
          ),
          -1,
          false
        );

        buttonPulse.value = withRepeat(
          withSequence(
            withTiming(1.025, {
              duration: 900,
            }),

            withTiming(1, {
              duration: 900,
            })
          ),
          -1,
          true
        );
      } else {
        progress.value = withTiming(0, {
          duration: 180,
        });

        mascotFloat.value = 0;
        buttonPulse.value = 1;
      }
    }, [visible]);

    /* =======================================================
       MODAL STYLE
    ======================================================= */

    const modalStyle = useAnimatedStyle(() => {
      return {
        opacity: interpolate(
          progress.value,
          [0, 1],
          [0, 1]
        ),

        transform: [
          {
            translateY: interpolate(
              progress.value,
              [0, 1],
              [45, 0]
            ),
          },

          {
            scale: interpolate(
              progress.value,
              [0, 1],
              [0.92, 1]
            ),
          },
        ],
      };
    });

    /* =======================================================
       BADGE
    ======================================================= */

    const badgeStyle = useAnimatedStyle(() => {
      return {
        opacity: badgeProgress.value,

        transform: [
          {
            scale: interpolate(
              badgeProgress.value,
              [0, 1],
              [0.7, 1]
            ),
          },
        ],
      };
    });

    /* =======================================================
       MASCOT
    ======================================================= */

    const mascotStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateY: mascotFloat.value,
          },

          {
            scale: interpolate(
              progress.value,
              [0, 1],
              [0.75, 1]
            ),
          },
        ],
      };
    });

    /* =======================================================
       BUTTON
    ======================================================= */

    const buttonStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            scale: buttonPulse.value,
          },
        ],
      };
    });

    /* =======================================================
       CLAIM
    ======================================================= */

    const handleClaim = async () => {
      if (claiming || claimed) {
        return;
      }

      setClaiming(true);

      try {
        await onClaim();

        setClaimed(true);
        setClaiming(false);

        setTimeout(() => {
          onClose();
        }, 1400);
      } catch {
        setClaiming(false);
      }
    };

    if (!visible) {
      return null;
    }

    return (
      <Modal
        transparent
        visible={visible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          {/* =================================================
            DARK GLASS BACKDROP
        ================================================= */}

          <BlurView
            intensity={18}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.darkOverlay} />

          {/* =================================================
            CONFETTI
        ================================================= */}

          <Confetti />

          {/* =================================================
            MAIN CARD
        ================================================= */}

          <Animated.View
            style={[
              styles.container,
              {
                marginTop: insets.top * 0.1,
              },
              modalStyle,
            ]}
          >
            {/* Glass background */}

            <GlassBackground />

            {/* =================================================
              CONTENT
          ================================================= */}

            <View style={styles.content}>
              {/* =================================================
                CLOSE
            ================================================= */}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{
                  top: 12,
                  bottom: 12,
                  left: 12,
                  right: 12,
                }}
              >
                <Ionicons
                  name="close"
                  size={19}
                  color="rgba(255,255,255,0.75)"
                />
              </TouchableOpacity>

              {/* =================================================
                BADGE
            ================================================= */}

              <Animated.View
                style={[
                  styles.badgeWrap,
                  badgeStyle,
                ]}
              >
                <Text style={styles.badgeEmoji}>
                  🎁
                </Text>

                <Text style={styles.badgeText}>
                  DAILY REWARD
                </Text>
              </Animated.View>

              {/* =================================================
                MASCOT
            ================================================= */}

              <Animated.View
                style={[
                  styles.mascotContainer,
                  mascotStyle,
                ]}
              >
                <View style={styles.mascotGlow} />

                <Mascot
                  size={112}
                  pose="celebrating"
                  floating={false}
                />
              </Animated.View>

              {/* =================================================
                TITLE
            ================================================= */}

              <Text style={styles.title}>
                {claimed
                  ? "Reward Claimed! 🎉"
                  : "Daily Bonus is Ready!"}
              </Text>

              {/* =================================================
                SUBTITLE
            ================================================= */}

              <Text style={styles.subtitle}>
                {claimed
                  ? "Great job! Keep learning every day to keep your streak going strong."
                  : "You've earned your daily reward for showing up today. Claim it and keep your progress moving!"}
              </Text>

              {/* =================================================
                REWARDS
            ================================================= */}

              <View style={styles.rewardsRow}>
                <RewardCard
                  index={0}
                  icon="flash"
                  iconColor="#F2B300"
                  iconBackground="rgba(255,211,71,0.20)"
                  value={`+${rewardXp}`}
                  label="XP"
                />

                <RewardCard
                  index={1}
                  icon="diamond"
                  iconColor="#55A8FF"
                  iconBackground="rgba(91,169,255,0.18)"
                  value={`+${rewardGems}`}
                  label="Gems"
                />
              </View>

              {/* =================================================
                STREAK
            ================================================= */}

              <View style={styles.streakGlass}>
                <View style={styles.streakIcon}>
                  <Ionicons
                    name="flame"
                    size={18}
                    color="#FF9D35"
                  />
                </View>

                <View style={styles.streakTextWrap}>
                  <Text style={styles.streakTitle}>
                    {streakCount} day streak
                  </Text>

                  <Text style={styles.streakSubtitle}>
                    Keep showing up every day
                  </Text>
                </View>

                <Text style={styles.streakEmoji}>
                  🔥
                </Text>
              </View>

              {/* =================================================
                BUTTON
            ================================================= */}

              <Animated.View
                style={[
                  styles.buttonWrapper,
                  buttonStyle,
                ]}
              >
                <PrimaryButton
                  title={
                    claimed
                      ? "Claimed! 🌟"
                      : claiming
                        ? "Claiming…"
                        : "Claim Reward 🎁"
                  }
                  variant="reward"
                  size="large"
                  loading={claiming}
                  disabled={claimed}
                  onPress={handleClaim}
                  style={styles.claimButton}
                />
              </Animated.View>

              {/* =================================================
                LATER
            ================================================= */}

              {!claimed && (
                <TouchableOpacity
                  style={styles.laterBtn}
                  onPress={onClose}
                  activeOpacity={0.6}
                >
                  <Text style={styles.laterText}>
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     OVERLAY
  ======================================================= */

  overlay: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    paddingHorizontal: 12,

    backgroundColor:
      "rgba(12,8,25,0.58)",
  },

  darkOverlay: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(20,12,40,0.22)",
  },

  /* =======================================================
     CONTAINER
  ======================================================= */

  container: {
    width: "100%",

    maxWidth: CARD_WIDTH,

    minHeight: 590,

    borderRadius: CARD_RADIUS,

    overflow: "hidden",

    position: "relative",

    backgroundColor:
      "rgba(255,255,255,0.08)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.30)",

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 20,
    },

    shadowOpacity: 0.28,

    shadowRadius: 35,

    elevation: 25,
  },

  /* =======================================================
     CONTENT
  ======================================================= */

  content: {
    alignItems: "center",

    paddingHorizontal: 22,

    paddingTop: 25,

    paddingBottom: 20,

    zIndex: 10,
  },

  /* =======================================================
     GLASS
  ======================================================= */

  glassReflection: {
    position: "absolute",

    top: 1,

    left: 25,

    right: 25,

    height: 1,

    backgroundColor:
      "rgba(255,255,255,0.70)",

    opacity: 0.55,
  },

  glassBorder: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    borderRadius: CARD_RADIUS,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.25)",
  },

  /* =======================================================
     CLOSE
  ======================================================= */

  closeBtn: {
    position: "absolute",

    top: 16,

    right: 16,

    width: 34,

    height: 34,

    borderRadius: 17,

    backgroundColor:
      "rgba(255,255,255,0.13)",

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.22)",

    zIndex: 50,
  },

  /* =======================================================
     BADGE
  ======================================================= */

  badgeWrap: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      "rgba(255,220,100,0.15)",

    borderColor:
      "rgba(255,220,100,0.42)",

    borderWidth: 1,

    borderRadius: radius.pill,

    paddingHorizontal: 14,

    paddingVertical: 6,

    gap: 6,

    marginBottom: 4,
  },

  badgeEmoji: {
    fontSize: 14,
  },

  badgeText: {
    ...typography.tiny,

    color: "#FFE38A",

    fontWeight: "900",

    letterSpacing: 1,
  },

  /* =======================================================
     MASCOT
  ======================================================= */

  mascotContainer: {
    width: 130,

    height: 130,

    alignItems: "center",

    justifyContent: "center",

    marginTop: 2,

    marginBottom: 2,
  },

  mascotGlow: {
    position: "absolute",

    width: 100,

    height: 100,

    borderRadius: 50,

    backgroundColor:
      "rgba(255,210,70,0.13)",

    shadowColor: "#FFD85A",

    shadowOpacity: 0.45,

    shadowRadius: 35,

    shadowOffset: {
      width: 0,
      height: 0,
    },
  },

  /* =======================================================
     TITLE
  ======================================================= */

  title: {
    ...typography.h2,

    color: "#FFFFFF",

    textAlign: "center",

    marginTop: 3,

    fontWeight: "900",
  },

  subtitle: {
    ...typography.caption,

    color: "rgba(255,255,255,0.68)",

    textAlign: "center",

    marginTop: 7,

    paddingHorizontal: 8,

    lineHeight: 19,
  },

  /* =======================================================
     REWARD ROW
  ======================================================= */

  rewardsRow: {
    flexDirection: "row",

    width: "100%",

    gap: 10,

    marginTop: 18,

    marginBottom: 12,
  },

  rewardCardWrapper: {
    flex: 1,
  },

  rewardCard: {
    height: 108,

    borderRadius: 20,

    overflow: "hidden",

    alignItems: "center",

    justifyContent: "center",

    position: "relative",

    backgroundColor:
      "rgba(255,255,255,0.10)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.20)",
  },

  rewardCardTint: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.04)",
  },

  rewardIconBg: {
    width: 42,

    height: 42,

    borderRadius: 21,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 5,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.18)",
  },

  rewardValue: {
    ...typography.h3,

    color: "#FFFFFF",

    fontWeight: "900",
  },

  rewardLabel: {
    ...typography.tiny,

    color: "rgba(255,255,255,0.55)",

    fontWeight: "800",

    marginTop: 1,

    textTransform: "uppercase",

    letterSpacing: 0.7,
  },

  /* =======================================================
     STREAK
  ======================================================= */

  streakGlass: {
    width: "100%",

    minHeight: 56,

    borderRadius: 18,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 12,

    backgroundColor:
      "rgba(255,255,255,0.09)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.18)",

    marginBottom: 15,
  },

  streakIcon: {
    width: 34,

    height: 34,

    borderRadius: 17,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,155,50,0.15)",

    borderWidth: 1,

    borderColor:
      "rgba(255,170,70,0.22)",
  },

  streakTextWrap: {
    flex: 1,

    marginLeft: 10,
  },

  streakTitle: {
    fontSize: 13,

    fontWeight: "800",

    color: "#FFFFFF",
  },

  streakSubtitle: {
    fontSize: 10,

    fontWeight: "600",

    color:
      "rgba(255,255,255,0.52)",

    marginTop: 2,
  },

  streakEmoji: {
    fontSize: 20,

    marginRight: 3,
  },

  /* =======================================================
     BUTTON
  ======================================================= */

  buttonWrapper: {
    width: "100%",

    alignItems: "center",
  },

  claimButton: {
    width: "100%",

    borderRadius: 18,

    ...StyleSheet.flatten({
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    }),
  },

  /* =======================================================
     LATER
  ======================================================= */

  laterBtn: {
    marginTop: 11,

    paddingVertical: 4,
  },

  laterText: {
    ...typography.caption,

    color:
      "rgba(255,255,255,0.50)",

    fontWeight: "700",
  },
});

export default DailyRewardModal;