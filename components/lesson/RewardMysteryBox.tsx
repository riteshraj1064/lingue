import { Ionicons } from "@expo/vector-icons";
import { Canvas, Circle, RadialGradient, vec } from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { soundService } from "../../services/soundService";

const TREASURE_CHEST = require("../../assets/animations/TreasureChest.json");
const COIN_ANIM = require("../../assets/animations/Stars.json");
const DIAMOND_ANIM = require("../../assets/animations/Diamond.json");

interface RewardMysteryBoxProps {
  xpEarned: number;
  coinsEarned?: number;
  gemsEarned?: number;
  isOpened: boolean;
  onOpen: () => void;
  width: number;
}

interface ParticleConfig {
  id: number;
  type: "coin" | "gem";
  targetX: number;
  targetY: number;
  rotation: number;
  delay: number;
  scale: number;
}

// 12 bursting particles radiating outwards from the chest
const BURST_PARTICLES: ParticleConfig[] = [
  { id: 1, type: "coin", targetX: -85, targetY: -125, rotation: 360, delay: 0, scale: 1.1 },
  { id: 2, type: "gem", targetX: -50, targetY: -160, rotation: -180, delay: 30, scale: 1.15 },
  { id: 3, type: "coin", targetX: -15, targetY: -175, rotation: 540, delay: 60, scale: 1.2 },
  { id: 4, type: "gem", targetX: 25, targetY: -170, rotation: 360, delay: 90, scale: 1.25 },
  { id: 5, type: "coin", targetX: 60, targetY: -150, rotation: -360, delay: 120, scale: 1.1 },
  { id: 6, type: "gem", targetX: 95, targetY: -120, rotation: 180, delay: 150, scale: 1.15 },
  { id: 7, type: "coin", targetX: -110, targetY: -65, rotation: 720, delay: 180, scale: 0.95 },
  { id: 8, type: "gem", targetX: 110, targetY: -65, rotation: -720, delay: 210, scale: 1.0 },
  { id: 9, type: "coin", targetX: -45, targetY: -95, rotation: 360, delay: 240, scale: 1.05 },
  { id: 10, type: "gem", targetX: 45, targetY: -100, rotation: -360, delay: 270, scale: 1.1 },
  { id: 11, type: "coin", targetX: 0, targetY: -140, rotation: 540, delay: 300, scale: 1.15 },
  { id: 12, type: "gem", targetX: -70, targetY: -85, rotation: -180, delay: 330, scale: 0.95 },
];

export const RewardMysteryBox: React.FC<RewardMysteryBoxProps> = ({
  xpEarned,
  coinsEarned,
  gemsEarned,
  isOpened,
  onOpen,
  width,
}) => {
  const lottieRef = useRef<LottieView>(null);

  // Dynamic server-derived coins and gems
  const displayCoins =
    typeof coinsEarned === "number"
      ? coinsEarned
      : Math.max(1, xpEarned);

  const displayGems =
    typeof gemsEarned === "number"
      ? gemsEarned
      : Math.max(1, Math.round(xpEarned / 10));

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleBump = useRef(new Animated.Value(1)).current;
  const rewardsFadeAnim = useRef(new Animated.Value(0)).current;
  const rewardsScaleAnim = useRef(new Animated.Value(0.7)).current;

  // Particle animated values
  const particleAnims = useRef(
    BURST_PARTICLES.map(() => ({
      progress: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const [hasTriggeredOpen, setHasTriggeredOpen] = useState(isOpened);

  // Gentle floating animation while unopened
  useEffect(() => {
    if (hasTriggeredOpen) return;

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [hasTriggeredOpen]);

  // If already opened when mounted or triggered externally
  useEffect(() => {
    if (isOpened && !hasTriggeredOpen) {
      handleTriggerOpen();
    }
  }, [isOpened]);

  const handleTriggerOpen = () => {
    if (hasTriggeredOpen) return;
    setHasTriggeredOpen(true);

    // Initial heavy haptic impact & play collect audio
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    soundService.playCollect();

    // Chest lid spring & opening
    Animated.sequence([
      Animated.timing(scaleBump, {
        toValue: 0.88,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scaleBump, {
        toValue: 1.16,
        friction: 3,
        tension: 140,
        useNativeDriver: true,
      }),
      Animated.timing(scaleBump, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Play treasure chest opening from frame 34 to 88
    lottieRef.current?.play(34, 88);

    // Burst fountain of coins and gems
    BURST_PARTICLES.forEach((p, idx) => {
      const anim = particleAnims[idx];
      setTimeout(() => {
        // Subtle haptic tick for burst sensation
        if (idx % 3 === 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }

        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(anim.progress, {
            toValue: 1,
            duration: 750,
            easing: Easing.out(Easing.back(1.4)),
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Keep floating gently at apex
          Animated.timing(anim.opacity, {
            toValue: 0.9,
            duration: 400,
            useNativeDriver: true,
          }).start();
        });
      }, p.delay);
    });

    // Reveal reward showcase cards after burst apex
    setTimeout(() => {
      soundService.playCombo();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      Animated.parallel([
        Animated.timing(rewardsFadeAnim, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(rewardsScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      onOpen();
    }, 420);
  };

  const chestSize = Math.min(width * 0.42, 160);

  return (
    <View style={styles.container}>
      {/* ========================================================
          SKIA AMBIENT GLOW
      ======================================================== */}
      <View style={[styles.glowCanvasWrapper, { width: chestSize * 1.8, height: chestSize * 1.8 }]}>
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Circle cx={chestSize * 0.9} cy={chestSize * 0.9} r={chestSize * 0.75}>
            <RadialGradient
              c={vec(chestSize * 0.9, chestSize * 0.9)}
              r={chestSize * 0.75}
              colors={[
                hasTriggeredOpen ? "rgba(247,183,24,0.30)" : "rgba(112,84,246,0.22)",
                hasTriggeredOpen ? "rgba(61,205,226,0.15)" : "rgba(247,183,24,0.08)",
                "rgba(112,84,246,0.0)",
              ]}
            />
          </Circle>
        </Canvas>
      </View>

      {/* ========================================================
          UNOPENED PROMPT PILL
      ======================================================== */}
      {!hasTriggeredOpen && (
        <Animated.View
          style={[
            styles.tapPromptPill,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons name="sparkles" size={14} color="#F7B718" style={{ marginRight: 6 }} />
          <Text style={styles.tapPromptText}>Tap the box to open!</Text>
          <Ionicons name="hand-left" size={14} color="#6847F5" style={{ marginLeft: 6 }} />
        </Animated.View>
      )}

      {/* ========================================================
          INTERACTIVE CHEST BOX
      ======================================================== */}
      <TouchableOpacity
        onPress={handleTriggerOpen}
        activeOpacity={0.9}
        style={styles.chestPressable}
        accessibilityRole="button"
        accessibilityLabel="Open reward chest"
      >
        <Animated.View
          style={[
            styles.chestWrapper,
            {
              width: chestSize,
              height: chestSize,
              transform: [
                { translateY: hasTriggeredOpen ? 0 : floatAnim },
                { scale: hasTriggeredOpen ? scaleBump : pulseAnim },
              ],
            },
          ]}
        >
          <LottieView
            ref={lottieRef}
            source={TREASURE_CHEST}
            autoPlay={false}
            loop={false}
            resizeMode="contain"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* ========================================================
          BURSTING COINS & DIAMOND GEMS
      ======================================================== */}
      {hasTriggeredOpen && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {BURST_PARTICLES.map((particle, idx) => {
            const anim = particleAnims[idx];
            const transX = anim.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, particle.targetX],
            });
            const transY = anim.progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, particle.targetY - 20, particle.targetY],
            });
            const rot = anim.progress.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", `${particle.rotation}deg`],
            });
            const sc = anim.progress.interpolate({
              inputRange: [0, 0.4, 1],
              outputRange: [0.2, particle.scale * 1.3, particle.scale],
            });

            const isCoin = particle.type === "coin";

            return (
              <Animated.View
                key={particle.id}
                style={[
                  styles.burstParticle,
                  {
                    opacity: anim.opacity,
                    transform: [
                      { translateX: transX },
                      { translateY: transY },
                      { rotate: rot },
                      { scale: sc },
                    ],
                  },
                ]}
              >
                {isCoin ? (
                  <View style={styles.coinParticlePod}>
                    <Ionicons name="star" size={13} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.gemParticlePod}>
                    <Ionicons name="diamond" size={13} color="#FFFFFF" />
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* ========================================================
          REWARD SHOWCASE CARDS (COINS & GEMS & XP)
      ======================================================== */}
      {hasTriggeredOpen && (
        <Animated.View
          style={[
            styles.rewardsContainer,
            {
              opacity: rewardsFadeAnim,
              transform: [{ scale: rewardsScaleAnim }],
            },
          ]}
        >
          {/* COINS CARD */}
          <View style={[styles.rewardGlassCard, styles.coinCardGlow]}>
            <View style={styles.rewardGlassHighlight} />
            <View style={styles.rewardAnimPod}>
              <LottieView
                source={COIN_ANIM}
                autoPlay
                loop
                resizeMode="contain"
                style={styles.miniLottie}
              />
            </View>
            <View style={styles.rewardTextCol}>
              <Text style={styles.rewardNumberGold}>+{displayCoins}</Text>
              <Text style={styles.rewardLabel}>COINS</Text>
            </View>
          </View>

          {/* DIAMOND GEMS CARD */}
          <View style={[styles.rewardGlassCard, styles.gemCardGlow]}>
            <View style={styles.rewardGlassHighlight} />
            <View style={styles.rewardAnimPod}>
              <LottieView
                source={DIAMOND_ANIM}
                autoPlay
                loop
                resizeMode="contain"
                style={styles.miniLottie}
              />
            </View>
            <View style={styles.rewardTextCol}>
              <Text style={styles.rewardNumberCyan}>+{displayGems}</Text>
              <Text style={styles.rewardLabel}>GEMS</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 10,
  },

  glowCanvasWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },

  tapPromptPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(104, 71, 245, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(104, 71, 245, 0.28)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginBottom: 8,
    zIndex: 10,
  },

  tapPromptText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#17142B",
    letterSpacing: 0.2,
  },

  chestPressable: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  chestWrapper: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },

  /* Bursting flying coins and gems */
  burstParticle: {
    position: "absolute",
    left: "50%",
    top: "40%",
    marginLeft: -16,
    marginTop: -16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 25,
  },

  coinParticlePod: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F7B718",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFF6D6",
    shadowColor: "#F7B718",
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  gemParticlePod: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3DCDE2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E1FBFF",
    shadowColor: "#3DCDE2",
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  /* Revealed Rewards Showcase */
  rewardsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 14,
    zIndex: 15,
  },

  rewardGlassCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 136,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  coinCardGlow: {
    borderColor: "rgba(247, 183, 24, 0.45)",
    backgroundColor: "rgba(255, 250, 235, 0.88)",
  },

  gemCardGlow: {
    borderColor: "rgba(61, 205, 226, 0.45)",
    backgroundColor: "rgba(240, 253, 255, 0.88)",
  },

  rewardGlassHighlight: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },

  rewardAnimPod: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  miniLottie: {
    width: 38,
    height: 38,
  },

  rewardTextCol: {
    justifyContent: "center",
  },

  rewardNumberGold: {
    fontSize: 18,
    fontWeight: "900",
    color: "#B47800",
    letterSpacing: -0.4,
  },

  rewardNumberCyan: {
    fontSize: 18,
    fontWeight: "900",
    color: "#088395",
    letterSpacing: -0.4,
  },

  rewardLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6E6A80",
    letterSpacing: 0.6,
    marginTop: 1,
  },
});
