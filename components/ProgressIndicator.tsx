// components/ProgressIndicator.tsx
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radius } from "../constant/constant";

export interface ProgressIndicatorProps {
  totalSteps?: number;
  currentStep: number; // 1-indexed (e.g. 1 to 4)
  variant?: "dots" | "bar";
  style?: StyleProp<ViewStyle>;
  color?: string;
  height?: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  totalSteps = 4,
  currentStep,
  variant = "dots",
  style,
  color = colors.primary,
  height = 8,
}) => {
  if (variant === "bar") {
    const percent = Math.min(Math.max((currentStep / totalSteps) * 100, 0), 100);
    return (
      <View style={[styles.barTrack, { height }, style]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${percent}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.dotsContainer, style]}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = stepNum <= currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive && { backgroundColor: color },
              isCurrent && styles.dotActive,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0DBFB",
  },
  dotActive: {
    width: 22,
    borderRadius: radius.pill,
  },
  barTrack: {
    width: "100%",
    backgroundColor: "#EBEBEB",
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  barFill: {
    borderRadius: radius.pill,
  },
});

export default ProgressIndicator;
