// components/GameLoader.tsx

import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

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
   COLOR PALETTE
========================================================= */

const COLORS = {
  background: "#F5F2FF",
  purple: "#6847F5",
  purpleDark: "#5135D4",
  text: "#111126",
  textSecondary: "#626078",
  textMuted: "#77738C",
  green: "#16C58B",
  gold: "#F7B718",
  cyan: "#3DCDE2",
  orange: "#FF9600",
  danger: "#FF4B4B",
  white: "#FFFFFF",
};

/* =========================================================
   GLASS SKELETON CARD (NO BLUR, NO ELEVATION)
========================================================= */

const GlassSkeletonCard = ({ index }: { index: number }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
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
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0.5, 0.95]),
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [1, -2]),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.skeletonCardWrapper, animatedStyle]}>
      {/* Top highlight edge */}
      <View pointerEvents="none" style={styles.glassTopEdge} />

      <View style={styles.skeletonContent}>
        {/* Placeholder Icon Pod */}
        <View style={styles.skeletonCircle}>
          <View style={styles.skeletonCircleInner} />
        </View>

        {/* Placeholder Text Lines */}
        <View style={styles.skeletonLines}>
          <View style={[styles.skeletonLine, { width: "62%" }]} />
          <View
            style={[
              styles.skeletonLine,
              styles.skeletonSmallLine,
              { width: "38%" },
            ]}
          />
        </View>

        {/* Placeholder Arrow Badge */}
        <View style={styles.skeletonArrow}>
          <Ionicons
            name="chevron-forward"
            size={14}
            color="rgba(104,71,245,0.30)"
          />
        </View>
      </View>
    </Animated.View>
  );
};

/* =========================================================
   GLASS MESSAGE PILL (NO BLUR, NO ELEVATION)
========================================================= */

const GlassMessage = ({ message }: { message: string }) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850 }),
        withTiming(0, { duration: 850 })
      ),
      -1,
      false
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.45, 1]),
      transform: [
        {
          scale: interpolate(pulse.value, [0, 1], [0.85, 1.2]),
        },
      ],
    };
  });

  return (
    <View style={styles.messageWrapper}>
      {/* Top highlight edge */}
      <View pointerEvents="none" style={styles.glassTopEdge} />

      <View style={styles.messageContent}>
        {/* Glowing Indicator Dots */}
        <View style={styles.dotRow}>
          <Animated.View
            style={[
              styles.glowDot,
              { backgroundColor: COLORS.green },
              dotStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.glowDot,
              { backgroundColor: COLORS.gold },
              dotStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.glowDot,
              { backgroundColor: COLORS.purple },
              dotStyle,
            ]}
          />
        </View>

        <Text style={styles.messageText}>{message}</Text>
      </View>
    </View>
  );
};

/* =========================================================
   MAIN GAME LOADER COMPONENT
========================================================= */

export const GameLoader: React.FC<GameLoaderProps> = ({
  message,
  variant = "inline",
  cardCount = 4,
  showMascot = true,
  style,
}) => {
  const { width, height } = useWindowDimensions();
  const [tipIndex, setTipIndex] = useState(0);

  /* Animation values */
  const mascotScale = useSharedValue(1);
  const mascotFloat = useSharedValue(0);
  const rotation = useSharedValue(0);
  const auraPulse = useSharedValue(1);
  const sparkleOpacity = useSharedValue(0.5);

  /* Tip Rotation */
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GAME_TIPS.length);
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  /* Mascot Animations */
  useEffect(() => {
    mascotScale.value = withRepeat(
      withSequence(
        withTiming(1.06, {
          duration: 900,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 900,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    mascotFloat.value = withRepeat(
      withSequence(
        withTiming(-6, {
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
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
        withTiming(1.12, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      false
    );

    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.35, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: mascotFloat.value },
      { scale: mascotScale.value },
    ],
  }));

  const auraAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(auraPulse.value, [1, 1.12], [0.5, 0.9]),
    transform: [{ scale: auraPulse.value }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  /* =======================================================
     FULL / INLINE RENDERING
  ======================================================= */
  if (variant === "full" || variant === "inline") {
    return (
      <View
        style={[
          variant === "full" ? styles.fullContainer : styles.inlineContainer,
          style,
        ]}
      >
        {/* SKIA VISUAL BACKGROUND FOR FULL VARIANT */}
        {variant === "full" && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Rect x={0} y={0} width={width} height={height}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(width, height)}
                colors={["#F5F2FF", "#F0EDFF", "#F8F8FF", "#EEF9F7"]}
              />
            </Rect>

            <Circle
              cx={width * 0.85}
              cy={height * 0.2}
              r={width * 0.55}
              color="rgba(111,82,245,0.14)"
            />

            <Circle
              cx={width * 0.15}
              cy={height * 0.75}
              r={width * 0.5}
              color="rgba(61,205,226,0.12)"
            />
          </Canvas>
        )}

        {/* MASCOT WITH AURA */}
        {showMascot && (
          <View style={styles.mascotAuraWrapper}>
            <Animated.View style={[styles.glowAuraOuter, auraAnimatedStyle]} />
            <Animated.View style={[styles.glowAuraInner, auraAnimatedStyle]} />

            {/* Orbiting Sparkle Stars */}
            <Animated.View style={[styles.orbitStars, sparkleAnimatedStyle]}>
              <Text style={[styles.star, styles.starTop]}>✨</Text>
              <Text style={[styles.star, styles.starRight]}>⭐</Text>
              <Text style={[styles.star, styles.starBottom]}>✦</Text>
              <Text style={[styles.star, styles.starLeft]}>✨</Text>
            </Animated.View>

            {/* Mascot */}
            <Animated.View style={mascotAnimatedStyle}>
              <Mascot size="small" pose="happy" floating={false} />
            </Animated.View>
          </View>
        )}

        {/* MESSAGE PILL */}
        <GlassMessage message={message || GAME_TIPS[tipIndex]} />
      </View>
    );
  }

  /* =======================================================
     CARDS VARIANT RENDERING
  ======================================================= */
  return (
    <View style={[styles.skeletonContainer, style]}>
      {Array.from({ length: cardCount }).map((_, index) => (
        <GlassSkeletonCard key={index} index={index} />
      ))}
    </View>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },

  inlineContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    width: "100%",
  },

  /* Mascot Aura */
  mascotAuraWrapper: {
    position: "relative",
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  glowAuraOuter: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.18)",
  },

  glowAuraInner: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(247,183,24,0.08)",
    borderWidth: 1.2,
    borderColor: "rgba(247,183,24,0.22)",
  },

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

  /* Glass Message Pill */
  messageWrapper: {
    minHeight: 50,
    maxWidth: "94%",
    borderRadius: 25,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "rgba(104,71,245,0.045)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.18)",
  },

  glassTopEdge: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.70)",
  },

  messageContent: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },

  dotRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },

  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  messageText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    flexShrink: 1,
  },

  /* Skeleton Cards */
  skeletonContainer: {
    width: "100%",
    gap: 12,
  },

  skeletonCardWrapper: {
    width: "100%",
    height: 72,
    borderRadius: 20,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "rgba(104,71,245,0.035)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.16)",
  },

  skeletonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  skeletonCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  skeletonCircleInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(104,71,245,0.12)",
  },

  skeletonLines: {
    flex: 1,
  },

  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(104,71,245,0.10)",
  },

  skeletonSmallLine: {
    height: 9,
    marginTop: 7,
    backgroundColor: "rgba(104,71,245,0.06)",
  },

  skeletonArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(104,71,245,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});

export default GameLoader;