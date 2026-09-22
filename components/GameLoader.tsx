import React, { useEffect } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { BlurView } from "expo-blur";

import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  Canvas,
  Circle,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";

import {
  colors,
  radius,
  spacing,
  typography,
} from "../constant/constant";

import { Mascot } from "./Mascot";

/* =========================================================
   TIPS
========================================================= */

const GAME_TIPS = [
  "Summoning language paths... ✨",
  "Sharpening your vocabulary... 📚",
  "Feeding the Lingua owl... 🦉",
  "Powering up your streak... 🔥",
  "Polishing shiny gems... 💎",
  "Loading quest challenges... 🎯",
];

/* =========================================================
   TYPES
========================================================= */

export interface GameLoaderProps {
  message?: string;
  variant?: "full" | "inline" | "cards";
  cardCount?: number;
  showMascot?: boolean;
  style?: StyleProp<ViewStyle>;
}

/* =========================================================
   CONFIG
========================================================= */

const SPRING_DURATION = 900;

/* =========================================================
   GLASS SKELETON CARD
========================================================= */

const GlassSkeletonCard = ({
  index,
}: {
  index: number;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelaySafe(
      index * 90,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        progress.value,
        [0, 1],
        [0.48, 0.9]
      ),

      transform: [
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [1, -1]
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.skeletonCardWrapper,
        animatedStyle,
      ]}
    >
      <BlurView
        intensity={35}
        tint="light"
        style={StyleSheet.absoluteFill}
      />

      <Canvas
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        <RoundedRect
          x={0}
          y={0}
          width={380}
          height={72}
          r={20}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(380, 0)}
            colors={[
              "rgba(255,255,255,0.22)",
              "rgba(255,255,255,0.08)",
            ]}
          />
        </RoundedRect>
      </Canvas>

      <View style={styles.skeletonContent}>
        <View style={styles.skeletonCircle}>
          <View style={styles.skeletonCircleInner} />
        </View>

        <View style={styles.skeletonLines}>
          <View
            style={[
              styles.skeletonLine,
              {
                width: "62%",
              },
            ]}
          />

          <View
            style={[
              styles.skeletonLine,
              styles.skeletonSmallLine,
              {
                width: "38%",
              },
            ]}
          />
        </View>

        <View style={styles.skeletonArrow}>
          <View style={styles.skeletonArrowInner} />
        </View>
      </View>

      <View
        pointerEvents="none"
        style={styles.skeletonBorder}
      />
    </Animated.View>
  );
};

/* =========================================================
   SAFE DELAY HELPER
========================================================= */

const withDelaySafe = (
  delay: number,
  animation: any
) => {
  return require("react-native-reanimated").withDelay(
    delay,
    animation
  );
};

/* =========================================================
   GLASS MESSAGE
========================================================= */

const GlassMessage = ({
  message,
}: {
  message: string;
}) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 850,
        }),
        withTiming(0, {
          duration: 850,
        })
      ),
      -1,
      false
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        pulse.value,
        [0, 1],
        [0.45, 1]
      ),

      transform: [
        {
          scale: interpolate(
            pulse.value,
            [0, 1],
            [0.8, 1.2]
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.messageWrapper}>
      <BlurView
        intensity={65}
        tint="light"
        style={StyleSheet.absoluteFill}
      />

      <Canvas
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        <RoundedRect
          x={0}
          y={0}
          width={360}
          height={52}
          r={26}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(360, 52)}
            colors={[
              "rgba(255,255,255,0.30)",
              "rgba(255,255,255,0.10)",
            ]}
          />
        </RoundedRect>
      </Canvas>

      <View style={styles.messageContent}>
        <View style={styles.dotRow}>
          <Animated.View
            style={[
              styles.glowDot,
              {
                backgroundColor: colors.success,
              },
              dotStyle,
            ]}
          />

          <Animated.View
            style={[
              styles.glowDot,
              {
                backgroundColor: colors.reward,
              },
              dotStyle,
            ]}
          />

          <Animated.View
            style={[
              styles.glowDot,
              {
                backgroundColor: colors.primary,
              },
              dotStyle,
            ]}
          />
        </View>

        <Text style={styles.messageText}>
          {message}
        </Text>
      </View>

      <View
        pointerEvents="none"
        style={styles.messageBorder}
      />
    </View>
  );
};

/* =========================================================
   MAIN LOADER
========================================================= */

export const GameLoader: React.FC<
  GameLoaderProps
> = ({
  message,
  variant = "inline",
  cardCount = 4,
  showMascot = true,
  style,
}) => {
    const [tipIndex, setTipIndex] =
      React.useState(0);

    /* =======================================================
       ANIMATION VALUES
    ======================================================= */

    const mascotScale = useSharedValue(1);

    const mascotFloat = useSharedValue(0);

    const rotation = useSharedValue(0);

    const auraPulse = useSharedValue(1);

    const sparkleOpacity = useSharedValue(0.5);

    /* =======================================================
       TIP ROTATION
    ======================================================= */

    useEffect(() => {
      const interval = setInterval(() => {
        setTipIndex(
          (prev) =>
            (prev + 1) % GAME_TIPS.length
        );
      }, 2400);

      return () => clearInterval(interval);
    }, []);

    /* =======================================================
       MASCOT ANIMATIONS
    ======================================================= */

    useEffect(() => {
      mascotScale.value = withRepeat(
        withSequence(
          withTiming(1.06, {
            duration: 900,
            easing: Easing.inOut(
              Easing.ease
            ),
          }),

          withTiming(1, {
            duration: 900,
            easing: Easing.inOut(
              Easing.ease
            ),
          })
        ),
        -1,
        false
      );

      mascotFloat.value = withRepeat(
        withSequence(
          withTiming(-6, {
            duration: 1300,
            easing: Easing.inOut(
              Easing.ease
            ),
          }),

          withTiming(0, {
            duration: 1300,
            easing: Easing.inOut(
              Easing.ease
            ),
          })
        ),
        -1,
        false
      );

      rotation.value = withRepeat(
        withTiming(1, {
          duration: 5500,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      auraPulse.value = withRepeat(
        withSequence(
          withTiming(1.12, {
            duration: 1200,
          }),

          withTiming(1, {
            duration: 1200,
          })
        ),
        -1,
        false
      );

      sparkleOpacity.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 800,
          }),

          withTiming(0.35, {
            duration: 800,
          })
        ),
        -1,
        false
      );
    }, []);

    /* =======================================================
       MASCOT STYLE
    ======================================================= */

    const mascotAnimatedStyle =
      useAnimatedStyle(() => {
        return {
          transform: [
            {
              translateY:
                mascotFloat.value,
            },

            {
              scale:
                mascotScale.value,
            },
          ],
        };
      });

    /* =======================================================
       AURA STYLE
    ======================================================= */

    const auraAnimatedStyle =
      useAnimatedStyle(() => {
        return {
          opacity: interpolate(
            auraPulse.value,
            [1, 1.12],
            [0.5, 0.9]
          ),

          transform: [
            {
              scale: auraPulse.value,
            },
          ],
        };
      });

    /* =======================================================
       SPARKLE STYLE
    ======================================================= */

    const sparkleAnimatedStyle =
      useAnimatedStyle(() => {
        return {
          opacity:
            sparkleOpacity.value,

          transform: [
            {
              rotate: `${rotation.value * 360}deg`,
            },
          ],
        };
      });

    /* =======================================================
       FULL / INLINE
    ======================================================= */

    if (variant === "full" || variant === "inline") {
      return (
        <View
          style={[
            variant === "full"
              ? styles.fullContainer
              : styles.inlineContainer,
            style,
          ]}
        >
          {/* ===============================================
            FULLSCREEN GLASS BACKGROUND
        =============================================== */}

          {variant === "full" && (
            <>
              <BlurView
                intensity={35}
                tint="light"
                style={StyleSheet.absoluteFill}
              />

              <View
                pointerEvents="none"
                style={styles.fullGlassTint}
              />

              <Canvas
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              >
                <Circle
                  cx={80}
                  cy={160}
                  r={120}
                  color="rgba(125,95,255,0.08)"
                />

                <Circle
                  cx={330}
                  cy={520}
                  r={150}
                  color="rgba(80,180,255,0.06)"
                />
              </Canvas>
            </>
          )}

          {/* ===============================================
            MASCOT
        =============================================== */}

          {showMascot && (
            <View
              style={
                styles.mascotAuraWrapper
              }
            >
              {/* Aura */}

              <Animated.View
                style={[
                  styles.glowAuraOuter,
                  auraAnimatedStyle,
                ]}
              />

              <Animated.View
                style={[
                  styles.glowAuraInner,
                  auraAnimatedStyle,
                ]}
              />

              {/* Skia glow */}

              <Canvas
                pointerEvents="none"
                style={
                  StyleSheet.absoluteFill
                }
              >
                <Circle
                  cx={60}
                  cy={60}
                  r={47}
                  color="rgba(145,110,255,0.10)"
                />

                <Circle
                  cx={60}
                  cy={60}
                  r={30}
                  color="rgba(255,215,80,0.08)"
                />
              </Canvas>

              {/* Orbit */}

              <Animated.View
                style={[
                  styles.orbitStars,
                  sparkleAnimatedStyle,
                ]}
              >
                <Text
                  style={[
                    styles.star,
                    styles.starTop,
                  ]}
                >
                  ✨
                </Text>

                <Text
                  style={[
                    styles.star,
                    styles.starRight,
                  ]}
                >
                  ⭐
                </Text>

                <Text
                  style={[
                    styles.star,
                    styles.starBottom,
                  ]}
                >
                  ✦
                </Text>

                <Text
                  style={[
                    styles.star,
                    styles.starLeft,
                  ]}
                >
                  ✨
                </Text>
              </Animated.View>

              {/* Mascot */}

              <Animated.View
                style={mascotAnimatedStyle}
              >
                <Mascot
                  size="small"
                  pose="happy"
                  floating={false}
                />
              </Animated.View>
            </View>
          )}

          {/* ===============================================
            MESSAGE
        =============================================== */}

          <GlassMessage
            message={
              message ||
              GAME_TIPS[tipIndex]
            }
          />
        </View>
      );
    }

    /* =======================================================
       CARDS
    ======================================================= */

    return (
      <View
        style={[
          styles.skeletonContainer,
          style,
        ]}
      >
        {Array.from({
          length: cardCount,
        }).map((_, index) => (
          <GlassSkeletonCard
            key={index}
            index={index}
          />
        ))}
      </View>
    );
  };

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     FULL
  ======================================================= */

  fullContainer: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    padding: spacing.xl,

    overflow: "hidden",

    backgroundColor:
      "rgba(245,243,255,0.72)",
  },

  fullGlassTint: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.16)",
  },

  /* =======================================================
     INLINE
  ======================================================= */

  inlineContainer: {
    alignItems: "center",

    justifyContent: "center",

    paddingVertical: spacing.xl,

    width: "100%",
  },

  /* =======================================================
     MASCOT
  ======================================================= */

  mascotAuraWrapper: {
    position: "relative",

    width: 120,

    height: 120,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: spacing.md,
  },

  glowAuraOuter: {
    position: "absolute",

    width: 112,

    height: 112,

    borderRadius: 56,

    backgroundColor:
      "rgba(145,115,255,0.08)",

    borderWidth: 1,

    borderColor:
      "rgba(145,115,255,0.16)",
  },

  glowAuraInner: {
    position: "absolute",

    width: 88,

    height: 88,

    borderRadius: 44,

    backgroundColor:
      "rgba(255,215,80,0.06)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.14)",
  },

  /* =======================================================
     ORBIT
  ======================================================= */

  orbitStars: {
    position: "absolute",

    width: 116,

    height: 116,

    alignItems: "center",

    justifyContent: "center",

    zIndex: 5,
  },

  star: {
    position: "absolute",

    fontSize: 15,
  },

  starTop: {
    top: -2,

    left: 50,
  },

  starRight: {
    right: -1,

    top: 46,

    fontSize: 13,
  },

  starBottom: {
    bottom: -2,

    left: 52,

    fontSize: 11,
  },

  starLeft: {
    left: 0,

    top: 42,

    fontSize: 12,
  },

  /* =======================================================
     MESSAGE
  ======================================================= */

  messageWrapper: {
    minHeight: 52,

    maxWidth: "94%",

    borderRadius: radius.pill,

    overflow: "hidden",

    position: "relative",

    backgroundColor:
      "rgba(255,255,255,0.12)",

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 6,
    },

    shadowOpacity: 0.08,

    shadowRadius: 15,

    elevation: 5,
  },

  messageContent: {
    minHeight: 52,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 18,

    paddingVertical: 10,

    gap: 10,
  },

  messageBorder: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    borderRadius: radius.pill,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.30)",
  },

  dotRow: {
    flexDirection: "row",

    gap: 4,

    alignItems: "center",
  },

  glowDot: {
    width: 6,

    height: 6,

    borderRadius: 3,

    shadowColor: "#FFFFFF",

    shadowOffset: {
      width: 0,

      height: 0,
    },

    shadowOpacity: 0.4,

    shadowRadius: 4,
  },

  messageText: {
    ...typography.bodyMedium,

    fontWeight: "700",

    color: colors.textPrimary,

    flexShrink: 1,
  },

  /* =======================================================
     SKELETON
  ======================================================= */

  skeletonContainer: {
    width: "100%",

    gap: 12,
  },

  skeletonCardWrapper: {
    width: "100%",

    height: 72,

    borderRadius: 20,

    overflow: "hidden",

    position: "relative",

    backgroundColor:
      "rgba(255,255,255,0.10)",

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 5,
    },

    shadowOpacity: 0.06,

    shadowRadius: 12,

    elevation: 3,
  },

  skeletonContent: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 15,
  },

  skeletonBorder: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    borderRadius: 20,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.24)",
  },

  skeletonCircle: {
    width: 42,

    height: 42,

    borderRadius: 21,

    backgroundColor:
      "rgba(145,130,200,0.15)",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 14,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.20)",
  },

  skeletonCircleInner: {
    width: 23,

    height: 23,

    borderRadius: 12,

    backgroundColor:
      "rgba(255,255,255,0.18)",
  },

  skeletonLines: {
    flex: 1,
  },

  skeletonLine: {
    height: 13,

    borderRadius: 7,

    backgroundColor:
      "rgba(130,115,180,0.16)",
  },

  skeletonSmallLine: {
    height: 9,

    marginTop: 7,
  },

  skeletonArrow: {
    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor:
      "rgba(130,115,180,0.12)",

    alignItems: "center",

    justifyContent: "center",

    marginLeft: 10,
  },

  skeletonArrowInner: {
    width: 8,

    height: 8,

    borderTopWidth: 2,

    borderRightWidth: 2,

    borderColor:
      "rgba(100,90,140,0.25)",

    transform: [
      {
        rotate: "45deg",
      },
    ],

    marginLeft: -3,
  },
});

export default GameLoader;