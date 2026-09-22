// components/Mascot.tsx
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, responsive, shadows, typography } from "../constant/constant";

// Default Mascot Image Asset
const DEFAULT_MASCOT: ImageSourcePropType = require("../assets/images/mascot.png");

export type MascotPose = "welcoming" | "happy" | "studying" | "waving" | "celebrating" | "encouraging" | "letter";

interface MascotProps {
  size?: "tiny" | "small" | "home" | "auth" | "onboarding" | "celebration" | "splash" | number;
  pose?: MascotPose;
  speechText?: string;
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
  customImage?: ImageSourcePropType;
}

const sizeMap = {
  tiny: 36,
  small: 56,
  home: 88,
  auth: responsive.mascotAuthSize,
  onboarding: responsive.mascotOnboardingSize,
  celebration: responsive.mascotCelebrationSize,
  splash: responsive.mascotSplashSize,
};

export const Mascot: React.FC<MascotProps> = ({
  size = "auth",
  pose = "welcoming",
  speechText,
  floating = true,
  style,
  customImage,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  const targetSize = typeof size === "number" ? size : sizeMap[size] || 150;

  useEffect(() => {
    if (!floating) return;

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    bounce.start();

    return () => bounce.stop();
  }, [floating, floatAnim]);

  return (
    <View style={[styles.wrapper, style]}>
      {speechText ? (
        <View style={styles.speechBubbleContainer}>
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>{speechText}</Text>
          </View>
          <View style={styles.speechTail} />
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.imageContainer,
          {
            width: targetSize,
            height: targetSize,
            transform: [{ translateY: floating ? floatAnim : 0 }],
          },
        ]}
      >
        <Image
          source={customImage || DEFAULT_MASCOT}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />

        {/* Dynamic accessory badges for different poses */}
        {pose === "letter" && (
          <View style={[styles.badge, styles.letterBadge]}>
            <Text style={styles.badgeEmoji}>✉️</Text>
          </View>
        )}
        {pose === "celebrating" && (
          <View style={[styles.badge, styles.celebrateBadge]}>
            <Text style={styles.badgeEmoji}>✨</Text>
          </View>
        )}
        {pose === "studying" && (
          <View style={[styles.badge, styles.studyBadge]}>
            <Text style={styles.badgeEmoji}>📚</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },
  letterBadge: {
    bottom: 8,
    right: 4,
    backgroundColor: "#FFF2E5",
    borderWidth: 2,
    borderColor: colors.white,
  },
  celebrateBadge: {
    top: 4,
    right: 6,
    backgroundColor: "#FFF8DD",
    borderWidth: 2,
    borderColor: colors.white,
  },
  studyBadge: {
    bottom: 6,
    left: 4,
    backgroundColor: "#F1F6FF",
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeEmoji: {
    fontSize: 16,
  },
  speechBubbleContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  speechBubble: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.card,
    maxWidth: 240,
  },
  speechText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  speechTail: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.white,
    marginTop: -1,
  },
});

export default Mascot;
