// components/LanguageCard.tsx
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
import { LanguageOption, colors, dimensions, radius, shadows, typography } from "../constant/constant";

export interface LanguageCardProps {
  language: LanguageOption;
  selected?: boolean;
  onPress: (language: LanguageOption) => void;
  style?: StyleProp<ViewStyle>;
  variant?: "list" | "grid";
}

export const LanguageCard: React.FC<LanguageCardProps> = ({
  language,
  selected = false,
  onPress,
  style,
  variant = "list",
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

  if (variant === "grid") {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.gridWrapper]}>
        <Pressable
          onPress={() => onPress(language)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.gridCard,
            selected && styles.cardSelected,
            style,
          ]}
        >
          <View style={styles.gridFlagContainer}>
            <Text style={styles.gridFlagText}>{language.flag}</Text>
          </View>
          <Text style={[styles.gridName, selected && styles.textSelected]}>
            {language.name}
          </Text>
          {selected ? (
            <View style={styles.gridCheckBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], width: "100%" }]}>
      <Pressable
        onPress={() => onPress(language)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          selected ? styles.cardSelected : styles.cardDefault,
          style,
        ]}
      >
        <View style={styles.leftSection}>
          <View style={styles.flagCircle}>
            <Text style={styles.flagText}>{language.flag}</Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={[styles.name, selected && styles.textSelected]}>
              {language.name}
            </Text>
            {language.learners ? (
              <Text style={styles.learners}>{language.learners}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightSection}>
          {selected ? (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={16} color={colors.white} />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    height: dimensions.languageCardHeight,
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
    flex: 1,
  },
  flagCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  flagText: {
    fontSize: 22,
  },
  nameContainer: {
    justifyContent: "center",
  },
  name: {
    ...typography.bodyLarge,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  learners: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  textSelected: {
    color: colors.primary,
    fontWeight: "800",
  },
  rightSection: {
    marginLeft: 8,
  },
  checkBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Grid styles
  gridWrapper: {
    width: "48%",
    marginBottom: 12,
  },
  gridCard: {
    height: 90,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    position: "relative",
    ...shadows.subtle,
  },
  gridFlagContainer: {
    marginBottom: 6,
  },
  gridFlagText: {
    fontSize: 28,
  },
  gridName: {
    ...typography.label,
    color: colors.textPrimary,
    textAlign: "center",
  },
  gridCheckBadge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
});

export default LanguageCard;
