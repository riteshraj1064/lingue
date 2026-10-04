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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Canvas, Circle, LinearGradient, Rect, vec } from "@shopify/react-native-skia";
import { responsive, spacing } from "../constant/constant";

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
  hasSkiaBackground?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: readonly ("top" | "right" | "bottom" | "left")[];
  withBottomPadding?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  backgroundColor = "transparent",
  hasSkiaBackground = true,
  style,
  contentContainerStyle,
  edges = ["top", "bottom", "left", "right"],
  withBottomPadding = true,
}) => {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.root}>
      {hasSkiaBackground ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width, height)}
              colors={["#F5F2FF", "#F0EDFF", "#F8F8FF", "#EEF9F7"]}
            />
          </Rect>
          <Circle cx={width * 0.88} cy={height * 0.13} r={width * 0.57} color="rgba(111,82,245,0.14)" />
          <Circle cx={-width * 0.05} cy={height * 0.78} r={width * 0.53} color="rgba(61,205,226,0.13)" />
          <Circle cx={width * 0.65} cy={height * 0.95} r={width * 0.44} color="rgba(112,87,245,0.10)" />
        </Canvas>
      ) : null}

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
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F2FF",
  },
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
