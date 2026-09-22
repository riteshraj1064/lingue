// components/Header.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { colors, dimensions, typography } from "../constant/constant";

export interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  centerComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = true,
  onBack,
  centerComponent,
  rightComponent,
  style,
  transparent = false,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.header,
        transparent ? styles.headerTransparent : styles.headerSolid,
        style,
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.centerContainer}>
        {centerComponent ? (
          centerComponent
        ) : title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightContainer}>{rightComponent}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: dimensions.headerHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    width: "100%",
  },
  headerSolid: {
    backgroundColor: colors.background,
  },
  headerTransparent: {
    backgroundColor: colors.transparent,
  },
  leftContainer: {
    width: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rightContainer: {
    width: 48,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
});

export default Header;
