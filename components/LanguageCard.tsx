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
import { LanguageOption, colors, dimensions, radius, typography } from "../constant/constant";

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
          <View pointerEvents="none" style={styles.glassTopEdge} />
          <View style={styles.gridFlagContainer}>
            <Text style={styles.gridFlagText}>{language.flag}</Text>
          </View>
          <Text style={[styles.gridName, selected && styles.textSelected]} numberOfLines={1}>
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
        <View pointerEvents="none" style={styles.glassTopEdge} />
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
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
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
    height: dimensions.languageCardHeight,
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
    flex: 1,
  },
  flagCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(104,71,245,0.07)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  flagText: {
    fontSize: 24,
  },
  nameContainer: {
    justifyContent: "center",
  },
  name: {
    ...typography.bodyLarge,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  learners: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  textSelected: {
    color: colors.primary,
    fontWeight: "900",
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
    height: 94,
    borderRadius: radius.card,
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.16)",
    backgroundColor: "rgba(104,71,245,0.035)",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    position: "relative",
    overflow: "hidden",
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
    fontWeight: "700",
  },
  gridCheckBadge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
});

export default LanguageCard;
