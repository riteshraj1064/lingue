// components/Confetti.tsx
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { colors } from "../constant/constant";

const { width } = Dimensions.get("window");

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  shape: "circle" | "rect";
  duration: number;
  delay: number;
}

const CONFETTI_COLORS = [
  colors.primary,
  colors.success,
  colors.reward,
  colors.rewardOrange,
  colors.secondaryBlue,
  colors.danger,
];

export const Confetti: React.FC = () => {
  const particles: Particle[] = Array.from({ length: 32 }).map((_, i) => ({
    id: i,
    x: Math.random() * (width - 40) + 20,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: Math.random() * 8 + 6,
    rotation: Math.random() * 360,
    shape: i % 2 === 0 ? "circle" : "rect",
    duration: 2500 + Math.random() * 2000,
    delay: Math.random() * 800,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiPiece key={p.id} particle={p} />
      ))}
    </View>
  );
};

const ConfettiPiece: React.FC<{ particle: Particle }> = ({ particle }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: particle.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [anim, particle.delay, particle.duration]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 600],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [particle.x, particle.x + 25 * (particle.id % 2 === 0 ? 1 : -1), particle.x],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${particle.rotation}deg`, `${particle.rotation + 720}deg`],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: particle.size,
          height: particle.shape === "circle" ? particle.size : particle.size * 1.6,
          borderRadius: particle.shape === "circle" ? particle.size / 2 : 2,
          backgroundColor: particle.color,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate },
          ],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});

export default Confetti;
