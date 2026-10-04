// components/GoalCard.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { DailyGoalOption, colors, dimensions, radius, typography } from "../constant/constant";

export interface GoalCardProps {
  goal: DailyGoalOption;
  selected?: boolean;
  onPress: (goal: DailyGoalOption) => void;
  style?: StyleProp<ViewStyle>;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  selected = false,
  onPress,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], width: "100%" }]}>
      <Pressable
        onPress={() => onPress(goal)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          selected ? styles.cardSelected : styles.cardDefault,
          style,
        ]}
      >
        <View pointerEvents="none" style={styles.glassTopEdge} />
        <View style={styles.leftSection}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: goal.badgeBg || "rgba(104,71,245,0.08)" },
            ]}
          >
            <Ionicons
              name={goal.iconName as any}
              size={22}
              color={goal.badgeColor || colors.primary}
            />
          </View>
          <Text style={[styles.title, selected && styles.textSelected]}>
            {goal.title}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <View
            style={[
              styles.durationBadge,
              selected && styles.durationBadgeSelected,
            ]}
          >
            <Text
              style={[
                styles.durationText,
                selected && styles.durationTextSelected,
              ]}
            >
              {goal.duration}
            </Text>
          </View>

          {selected ? (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  glassTopEdge: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.70)",
  },
  card: {
    height: dimensions.goalCardHeight,
    borderRadius: radius.card,
    borderWidth: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  cardDefault: {
    backgroundColor: "rgba(104,71,245,0.035)",
    borderColor: "rgba(104,71,245,0.16)",
  },
  cardSelected: {
    backgroundColor: "rgba(104,71,245,0.09)",
    borderColor: colors.primary,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.14)",
  },
  title: {
    ...typography.bodyLarge,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  textSelected: {
    color: colors.primary,
    fontWeight: "900",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(104,71,245,0.06)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.14)",
  },
  durationBadgeSelected: {
    backgroundColor: "rgba(104,71,245,0.12)",
    borderColor: colors.primary,
  },
  durationText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  durationTextSelected: {
    color: colors.primary,
    fontWeight: "800",
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});

export default GoalCard;
