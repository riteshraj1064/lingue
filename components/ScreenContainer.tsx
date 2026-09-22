// components/ScreenContainer.tsx
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, responsive, spacing } from "../constant/constant";

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: readonly ("top" | "right" | "bottom" | "left")[];
  withBottomPadding?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  backgroundColor = colors.background,
  style,
  contentContainerStyle,
  edges = ["top", "bottom", "left", "right"],
  withBottomPadding = true,
}) => {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, { backgroundColor }, style]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.centerWrapper}>
          <View style={styles.responsiveContainer}>
            {scrollable ? (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingHorizontal: responsive.horizontalPadding },
                  withBottomPadding && { paddingBottom: spacing.xxl },
                  contentContainerStyle,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.fixedContent,
                  { paddingHorizontal: responsive.horizontalPadding },
                  withBottomPadding && { paddingBottom: spacing.lg },
                  contentContainerStyle,
                ]}
              >
                {children}
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    width: "100%",
  },
  responsiveContainer: {
    flex: 1,
    width: "100%",
    maxWidth: responsive.contentMaxWidth,
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedContent: {
    flex: 1,
    width: "100%",
  },
});

export default ScreenContainer;
