// components/GlassCard.tsx
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  highlight?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  contentStyle,
  highlight = false,
}) => {
  return (
    <View
      style={[
        styles.glassCard,
        highlight && styles.highlight,
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.glassTopEdge} />
      <View style={[styles.glassContent, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  glassCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "rgba(104,71,245,0.035)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.16)",
  },
  highlight: {
    backgroundColor: "rgba(104,71,245,0.075)",
    borderColor: "rgba(104,71,245,0.30)",
  },
  glassTopEdge: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.70)",
  },
  glassContent: {
    position: "relative",
    zIndex: 2,
  },
});

export default GlassCard;
