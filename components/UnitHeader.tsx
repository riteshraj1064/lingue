import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../constant/constant";

interface UnitHeaderProps {
  unit: {
    id: number;
    title: string;
    description: string;
    order_index?: number;
    unlocked?: boolean;
    lessonsCount?: number;
  };
}

export function UnitHeader({ unit }: UnitHeaderProps) {
  const isUnlocked = unit.unlocked !== false;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          !isUnlocked && styles.cardLocked,
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.unitNumber, !isUnlocked && styles.textLocked]}>
            Unit {unit.order_index || 1}
          </Text>
        </View>

        <Text style={[styles.title, !isUnlocked && styles.textLocked]}>
          {unit.title}
        </Text>

        <Text style={[styles.description, !isUnlocked && styles.textLocked]}>
          {unit.description}
        </Text>

        <View style={styles.footerRow}>
          <View style={[styles.pill, !isUnlocked && styles.pillLocked]}>
            <Text style={[styles.pillText, !isUnlocked && styles.textLocked]}>
              {unit.lessonsCount || 0} Lessons
            </Text>
          </View>
          <View
            style={[
              styles.actionCircle,
              !isUnlocked && styles.actionCircleLocked,
            ]}
          >
            <Ionicons
              name={isUnlocked ? "chevron-forward" : "lock-closed"}
              size={18}
              color={colors.white}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: spacing.md,
    marginVertical: spacing.lg,
    alignItems: "flex-end", // As seen in the reference, these cards are often aligned to the right or center. We'll align center-right
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 16,
    width: "85%", // To leave room for the path/decorations on the left
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardLocked: {
    backgroundColor: "#F0F0F0",
    borderColor: "#E0E0E0",
  },
  headerRow: {
    marginBottom: 4,
  },
  unitNumber: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "800",
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: "800",
    marginBottom: 6,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  textLocked: {
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pill: {
    backgroundColor: colors.backgroundBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  pillLocked: {
    backgroundColor: "#E5E5E5",
  },
  pillText: {
    ...typography.tiny,
    color: colors.secondaryBlue,
    fontWeight: "700",
  },
  actionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },
  actionCircleLocked: {
    backgroundColor: "#B3B3B3",
  },
});
