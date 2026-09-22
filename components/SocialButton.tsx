// components/SocialButton.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { colors, dimensions, radius, shadows, typography } from "../constant/constant";

export interface SocialButtonProps {
  provider: "google" | "apple";
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SocialButton: React.FC<SocialButtonProps> = ({
  provider,
  onPress,
  style,
}) => {
  const isGoogle = provider === "google";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.button, shadows.subtle, style]}
    >
      {isGoogle ? (
        <View style={styles.googleIconContainer}>
          <Ionicons name="logo-google" size={20} color="#EA4335" />
        </View>
      ) : (
        <Ionicons name="logo-apple" size={22} color={colors.textPrimary} />
      )}
      <Text style={styles.text}>{isGoogle ? "Google" : "Apple"}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: dimensions.buttonHeight,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    flex: 1,
  },
  googleIconContainer: {
    marginRight: 8,
  },
  text: {
    ...typography.button,
    color: colors.textPrimary,
    marginLeft: 6,
  },
});

export default SocialButton;
