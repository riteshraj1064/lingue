import LottieView from "lottie-react-native";
import React, { useEffect, useMemo, useRef } from "react";
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

import {
  colors,
  radius,
  responsive,
  shadows,
  typography,
} from "../constant/constant";

const BIRDIE_ANIMATION = require("../assets/animations/WaveyBirdie.json");

// The single Lottie file contains four 120-frame state segments.
const SEGMENT = {
  idle: [0, 120] as const,
  speaking: [120, 240] as const,
  happy: [240, 360] as const,
  happySpeaking: [360, 480] as const,
};

export type MascotPose =
  | "welcoming"
  | "happy"
  | "studying"
  | "waving"
  | "celebrating"
  | "encouraging"
  | "letter";

interface MascotProps {
  size?:
  | "tiny"
  | "small"
  | "home"
  | "auth"
  | "onboarding"
  | "celebration"
  | "splash"
  | number;
  pose?: MascotPose;
  speechText?: string;
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
  customImage?: ImageSourcePropType;

  /** True only while the mascot's voice audio is playing. */
  isSpeaking?: boolean;

  /** Optional normalized audio playback progress from 0 to 1. */
  speechProgress?: number;
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
  isSpeaking = false,
  speechProgress,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<LottieView>(null);

  const targetSize = typeof size === "number" ? size : sizeMap[size] || 150;
  const isHappy = pose === "happy";

  const normalizedProgress = useMemo(() => {
    if (typeof speechProgress !== "number" || !Number.isFinite(speechProgress)) {
      return undefined;
    }
    return Math.max(0, Math.min(1, speechProgress));
  }, [speechProgress]);

  // Pick a segment from the same Lottie file:
  // idle = closed mouth + still wings
  // speaking = large talking mouth + still wings
  // happy = closed mouth + moving wings
  // happySpeaking = large talking mouth + moving wings
  const activeSegment = isHappy
    ? isSpeaking
      ? SEGMENT.happySpeaking
      : SEGMENT.happy
    : isSpeaking
      ? SEGMENT.speaking
      : SEGMENT.idle;

  const isTimelineControlled = isSpeaking && normalizedProgress !== undefined;
  const controlledProgress = isTimelineControlled
    ? (activeSegment[0] + normalizedProgress * (activeSegment[1] - activeSegment[0])) / 480
    : undefined;

  useEffect(() => {
    if (!floating) {
      floatAnim.stopAnimation();
      floatAnim.setValue(0);
      return;
    }

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

  useEffect(() => {
    if (customImage) return;

    const animation = lottieRef.current;
    if (!animation) return;

    if (!isHappy && !isSpeaking) {
      animation.reset();
      return;
    }

    // When audio progress is supplied, progress is mapped into the selected
    // 120-frame segment. Otherwise play and loop only that segment.
    if (isTimelineControlled) {
      animation.pause();
    } else {
      animation.play(activeSegment[0], activeSegment[1]);
    }
  }, [
    customImage,
    isHappy,
    isSpeaking,
    isTimelineControlled,
    activeSegment[0],
    activeSegment[1],
  ]);

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
        {customImage ? (
          <Image source={customImage} style={styles.mascot} resizeMode="contain" />
        ) : (
          <LottieView
            ref={lottieRef}
            source={BIRDIE_ANIMATION}
            autoPlay={false}
            loop={(isHappy || isSpeaking) && !isTimelineControlled}
            progress={controlledProgress}
            resizeMode="contain"
            style={styles.mascot}
          />
        )}

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
  mascot: {
    width: "100%",
    height: "100%",
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
