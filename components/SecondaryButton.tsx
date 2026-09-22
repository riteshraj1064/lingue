// components/SecondaryButton.tsx
import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { colors, dimensions, radius, typography } from "../constant/constant";

export interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "outline" | "ghost" | "surface";
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = "outline",
  icon,
  style,
  textStyle,
  testID,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  const getVariantStyles = () => {
    switch (variant) {
      case "ghost":
        return {
          backgroundColor: colors.transparent,
          borderWidth: 0,
        };
      case "surface":
        return {
          backgroundColor: colors.primarySurface,
          borderWidth: 0,
        };
      case "outline":
      default:
        return {
          backgroundColor: colors.white,
          borderWidth: 1.5,
          borderColor: colors.border,
        };
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], width: "100%" }]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          getVariantStyles(),
          style,
        ]}
      >
        {icon ? <Animated.View style={styles.iconContainer}>{icon}</Animated.View> : null}
        <Text
          style={[
            styles.text,
            variant === "surface" && { color: colors.primary },
            disabled && { color: colors.disabledText },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    height: dimensions.buttonHeight,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
    width: "100%",
  },
  text: {
    ...typography.button,
    color: colors.primary,
    textAlign: "center",
  },
  iconContainer: {
    marginRight: 8,
  },
});

export default SecondaryButton;
