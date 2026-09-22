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
import { DailyGoalOption, colors, dimensions, radius, shadows, typography } from "../constant/constant";

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
        <View style={styles.leftSection}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: goal.badgeBg },
            ]}
          >
            <Ionicons
              name={goal.iconName as any}
              size={22}
              color={goal.badgeColor}
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
              <Ionicons name="checkmark" size={14} color={colors.white} />
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    height: dimensions.goalCardHeight,
    borderRadius: radius.card,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    ...shadows.subtle,
  },
  cardDefault: {
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
    ...shadows.cardSelected,
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
  },
  title: {
    ...typography.bodyLarge,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  textSelected: {
    color: colors.primary,
    fontWeight: "800",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundOffWhite,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  durationBadgeSelected: {
    backgroundColor: colors.white,
    borderColor: colors.primaryLight,
  },
  durationText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  durationTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});

export default GoalCard;
