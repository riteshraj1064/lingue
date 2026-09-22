import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, radius, shadows, spacing, typography } from "../constant/constant";
import { Mascot } from "./Mascot";

type LessonState = "LOCKED" | "AVAILABLE" | "CURRENT" | "COMPLETED";

interface LessonData {
  id: number;
  title?: string;
  order_index?: number;
  completed?: boolean;
  unlocked?: boolean;
  current?: boolean;
}

interface LessonNodeProps {
  lesson: LessonData;
  onPress: (lesson: LessonData) => void;
  index?: number; // Used for horizontal offset pattern
}

export function LessonNode({ lesson, onPress, index = 0 }: LessonNodeProps) {
  // Determine node state
  let state: LessonState = "LOCKED";
  if (lesson.current) state = "CURRENT";
  else if (lesson.completed) state = "COMPLETED";
  else if (lesson.unlocked) state = "AVAILABLE";

  const isCurrent = state === "CURRENT";
  const isLocked = state === "LOCKED";
  const isCompleted = state === "COMPLETED";
  const isAvailable = state === "AVAILABLE";

  // Animation values
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isCurrent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1, // Infinite
        true
      );
    } else {
      pulseScale.value = 1;
    }
  }, [isCurrent]);

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  // Winding path offset calculation
  // Left -> Center -> Right -> Center -> Left...
  const getOffset = () => {
    const cycle = index % 4;
    if (cycle === 0) return -40; // Left
    if (cycle === 1) return 0;   // Center
    if (cycle === 2) return 40;  // Right
    if (cycle === 3) return 0;   // Center
    return 0;
  };

  const horizontalOffset = getOffset();

  // Color mapping based on state
  const getBgColor = () => {
    if (isLocked) return "#E5E5E5";
    if (isCompleted) return colors.reward;
    if (isCurrent) return colors.primary;
    return colors.primarySurface;
  };

  const getBorderColor = () => {
    if (isLocked) return "#CCCCCC";
    if (isCompleted) return "#E6B400"; // Darker yellow
    if (isCurrent) return colors.primaryDark;
    return colors.primary;
  };

  return (
    <View style={[styles.container, { transform: [{ translateX: horizontalOffset }] }]}>
      {isCurrent && (
        <View style={styles.currentIndicator}>
          <Text style={styles.startLabel}>START</Text>
          <View style={styles.startPointer} />
        </View>
      )}

      {/* Mascot next to current lesson */}
      {isCurrent && (
        <View style={styles.mascotContainer}>
          <Mascot size="tiny" pose="happy" />
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(lesson)}
        style={styles.buttonWrapper}
      >
        {isCurrent && (
          <Animated.View
            style={[
              styles.pulseRing,
              { borderColor: colors.primaryLight },
              animatedPulseStyle,
            ]}
          />
        )}

        <View
          style={[
            styles.node,
            {
              backgroundColor: getBgColor(),
              borderColor: getBorderColor(),
              borderBottomWidth: isLocked ? 4 : 6, // 3D depth
            },
            isCurrent && shadows.card,
          ]}
        >
          {isLocked && <Ionicons name="lock-closed" size={28} color="#B3B3B3" />}
          {isAvailable && <Ionicons name="star" size={28} color={colors.primary} />}
          {isCurrent && <Ionicons name="star" size={32} color={colors.white} />}
          {isCompleted && <Ionicons name="checkmark-sharp" size={36} color={colors.white} />}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    position: "relative",
    width: 160,
    height: 100,
  },
  buttonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  node: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  pulseRing: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    zIndex: 1,
    opacity: 0.5,
  },
  currentIndicator: {
    position: "absolute",
    top: -24,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    ...shadows.subtle,
    zIndex: 3,
  },
  startLabel: {
    ...typography.tiny,
    color: colors.primary,
    fontWeight: "900",
  },
  startPointer: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.white,
  },
  mascotContainer: {
    position: "absolute",
    left: -70, // Adjust depending on mascot size
    top: -10,
    zIndex: 4,
  },
});
