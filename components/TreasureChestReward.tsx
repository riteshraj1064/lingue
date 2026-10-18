import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import LottieView from "lottie-react-native";

const TREASURE_CHEST = require("../assets/animations/TreasureChest.json");
const GOLD_REWARD_ANIMATION = require("../assets/animations/Stars.json");
const DIAMOND_REWARD_ANIMATION = require("../assets/animations/Diamond.json");

export type RewardType = "gold" | "diamond";
export type MeasurableViewRef = React.RefObject<View | null>;

type TreasureChestButtonProps = {
  buttonRef: MeasurableViewRef;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function TreasureChestButton({
  buttonRef,
  onPress,
  size = 100,
  style,
  disabled = false,
}: TreasureChestButtonProps) {
  return (
    <Pressable
      ref={buttonRef}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Open treasure chest and collect reward"
      style={[styles.chestButton, { width: size, height: size }, style]}
    >
      <LottieView
        source={TREASURE_CHEST}
        autoPlay
        loop
        resizeMode="contain"
        style={StyleSheet.absoluteFill}
      />
    </Pressable>
  );
}

type RewardFlightEffectProps = {
  /** Increment once when the user collects a reward. */
  trigger: number;
  sourceRef: MeasurableViewRef;
  targetRef: MeasurableViewRef;
  /** Select which icon flies out of the chest. */
  type: RewardType;
  onArrive?: () => void;
  enabled?: boolean;
  size?: number;
};

export function RewardFlightEffect({
  trigger,
  sourceRef,
  targetRef,
  type,
  onArrive,
  enabled = true,
  size = 54,
}: RewardFlightEffectProps) {
  const rootRef = useRef<View>(null);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  useEffect(() => {
    if (!enabled || trigger === 0) return;

    const root = rootRef.current;
    const source = sourceRef.current;
    const target = targetRef.current;
    if (!root || !source || !target) return;

    root.measureInWindow((rootX, rootY) => {
      source.measureInWindow((sourceX, sourceY, sourceW, sourceH) => {
        target.measureInWindow((targetX, targetY, targetW, targetH) => {
          const fromX = sourceX - rootX + sourceW / 2 - size / 2;
          const fromY = sourceY - rootY + sourceH / 2 - size / 2;
          const toX = targetX - rootX + targetW / 2 - size / 2;
          const toY = targetY - rootY + targetH / 2 - size / 2;

          translateX.stopAnimation();
          translateY.stopAnimation();
          scale.stopAnimation();
          opacity.stopAnimation();
          translateX.setValue(0);
          translateY.setValue(0);
          scale.setValue(1);
          opacity.setValue(1);
          setStart({ x: fromX, y: fromY });
          setVisible(true);

          requestAnimationFrame(() => {
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: toX - fromX,
                duration: 750,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(translateY, {
                toValue: toY - fromY,
                duration: 750,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(scale, {
                toValue: 0.28,
                duration: 750,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.delay(480),
                Animated.timing(opacity, {
                  toValue: 0,
                  duration: 270,
                  useNativeDriver: true,
                }),
              ]),
            ]).start(({ finished }) => {
              if (finished) {
                setVisible(false);
                onArriveRef.current?.();
              }
            });
          });
        });
      });
    });
  }, [
    trigger,
    enabled,
    sourceRef,
    targetRef,
    size,
    translateX,
    translateY,
    scale,
    opacity,
  ]);

  const rewardSource =
    type === "diamond" ? DIAMOND_REWARD_ANIMATION : GOLD_REWARD_ANIMATION;

  return (
    <View
      ref={rootRef}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      collapsable={false}
    >
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flyingReward,
            {
              left: start.x,
              top: start.y,
              width: size,
              height: size,
              opacity,
              transform: [{ translateX }, { translateY }, { scale }],
            },
          ]}
        >
          <LottieView
            source={rewardSource}
            autoPlay
            loop={false}
            resizeMode="contain"
            style={styles.rewardAnimation}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chestButton: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  flyingReward: {
    position: "absolute",
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardAnimation: {
    width: "100%",
    height: "100%",
  },
});
