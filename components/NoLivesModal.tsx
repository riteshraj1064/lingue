// components/NoLivesModal.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, shadows, spacing, typography } from "../constant/constant";
import { useApp } from "../context/AppContext";
import { supabase } from "../services/supabase";
import { Confetti } from "./Confetti";

interface NoLivesModalProps {
  visible: boolean;
  onClose: () => void;
  onRefillSuccess?: () => void;
  title?: string;
  message?: string;
}

export const NoLivesModal: React.FC<NoLivesModalProps> = ({
  visible,
  onClose,
  onRefillSuccess,
  title = "Out of Lives!",
  message = "Lives is not available, kindly fill your hearts to start the lesson.",
}) => {
  const { stats, refillLives, buyLivesWithGems, buyLivesWithCoins, refreshStats } = useApp();

  // Unique idempotency key per ad session — prevents double-awarding if RPC is called twice
  const adRewardIdRef = useRef<string>("");

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseHeartAnim = useRef(new Animated.Value(1)).current;
  const adProgressAnim = useRef(new Animated.Value(0)).current;

  // Internal states: 'main' | 'watching_ad' | 'ad_completed' | 'shop_success'
  const [viewState, setViewState] = useState<
    "main" | "watching_ad" | "ad_completed" | "shop_success"
  >("main");
  const [adCountdown, setAdCountdown] = useState(5);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Entrance animation
  useEffect(() => {
    if (visible) {
      setViewState("main");
      setFeedbackNotice(null);
      setLoadingAction(null);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse for broken heart
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseHeartAnim, {
            toValue: 1.12,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseHeartAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      pulseHeartAnim.setValue(1);
    }
  }, [visible]);

  // Handle Watch Ad flow
  const handleStartWatchAd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });

    // Generate a fresh idempotency key for this ad session
    adRewardIdRef.current = `ad-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setViewState("watching_ad");
    setAdCountdown(5);
    adProgressAnim.setValue(0);

    Animated.timing(adProgressAnim, {
      toValue: 1,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Timer countdown
    const interval = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAdCompleted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAdCompleted = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    // Show success view immediately so UX is snappy
    setViewState("ad_completed");

    try {
      // Call the server RPC to claim the ad heart reward
      const { data, error } = await supabase.rpc("claim_ad_heart", {
        p_source_key: `ad-reward-${adRewardIdRef.current}`,
      });

      if (error) {
        console.error("[Ad] claim_ad_heart RPC error:", error);
        // Fallback: award locally if the RPC fails
        await refillLives(1);
      } else {
        const result = Array.isArray(data) ? data[0] : data;
        console.log("[Ad] claim_ad_heart result:", {
          hearts: result?.hearts,
          maxHearts: result?.max_hearts,
          awarded: result?.awarded,
          transactionId: result?.transaction_id,
        });
        // Sync server state into React context
        await refreshStats();
      }
    } catch (err) {
      console.error("[Ad] claim_ad_heart unexpected error:", err);
    }
  };

  // Handle Shop Refill with Gems (20 gems = 5 lives)
  const handleRefillWithGems = async () => {
    setLoadingAction("gems");
    setFeedbackNotice(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    const res = await buyLivesWithGems(20, 5);
    setLoadingAction(null);

    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      setViewState("shop_success");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      setFeedbackNotice(res.message);
    }
  };

  // Handle Shop Refill with Coins (50 coins = 5 lives)
  const handleRefillWithCoins = async () => {
    setLoadingAction("coins");
    setFeedbackNotice(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    const res = await buyLivesWithCoins(50, 5);
    setLoadingAction(null);

    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      setViewState("shop_success");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      setFeedbackNotice(res.message);
    }
  };

  const handleFinishAndProceed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    onClose();
    if (onRefillSuccess) {
      onRefillSuccess();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {(viewState === "ad_completed" || viewState === "shop_success") && <Confetti />}

        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button (disabled while ad is playing) */}
          {viewState !== "watching_ad" && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* ══════════════════════════════════════════════════════════
              VIEW: AD IN PROGRESS
             ══════════════════════════════════════════════════════════ */}
          {viewState === "watching_ad" && (
            <View style={styles.adPlayerContainer}>
              <View style={styles.adHeaderBadge}>
                <Ionicons name="videocam" size={14} color="#FFF" />
                <Text style={styles.adHeaderBadgeText}>SPONSORED AD</Text>
              </View>

              <View style={styles.adMockVideo}>
                <View style={styles.adVideoIconCircle}>
                  <Ionicons name="play" size={32} color="#FFF" />
                </View>
                <Text style={styles.adVideoTitle}>Lingua Super Pass</Text>
                <Text style={styles.adVideoSub}>Learn 2x faster with unlimited offline practice</Text>
              </View>

              {/* Progress bar and countdown */}
              <View style={styles.adProgressTrack}>
                <Animated.View
                  style={[
                    styles.adProgressFill,
                    {
                      width: adProgressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>

              <Text style={styles.adCountdownText}>
                Reward unlocks in <Text style={{ fontWeight: "800", color: colors.primary }}>{adCountdown}s</Text>
              </Text>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════
              VIEW: SUCCESS STATE (AD REWARD OR SHOP PURCHASE)
             ══════════════════════════════════════════════════════════ */}
          {(viewState === "ad_completed" || viewState === "shop_success") && (
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <Ionicons name="heart" size={56} color={colors.danger} />
                <View style={styles.plusOneBadge}>
                  <Text style={styles.plusOneText}>
                    {viewState === "shop_success" ? "+5" : "+1"}
                  </Text>
                </View>
              </View>

              <Text style={styles.successTitle}>
                {viewState === "shop_success" ? "Hearts Refilled! ❤️" : "Reward Unlocked! ❤️"}
              </Text>

              <Text style={styles.successSub}>
                {viewState === "shop_success"
                  ? "Your hearts have been fully replenished. You are ready to start learning!"
                  : "You earned +1 Life from watching the ad! You can now resume your lesson."}
              </Text>

              <View style={styles.heartsRow}>
                {[1, 2, 3, 4, 5].map((index) => (
                  <Ionicons
                    key={index}
                    name="heart"
                    size={28}
                    color={index <= stats.lives ? colors.danger : "#E5E5E5"}
                    style={{ marginHorizontal: 3 }}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryActionButton}
                activeOpacity={0.85}
                onPress={handleFinishAndProceed}
              >
                <Text style={styles.primaryActionText}>Start Lesson</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════
              VIEW: MAIN CUSTOM ALERT & OPTIONS
             ══════════════════════════════════════════════════════════ */}
          {viewState === "main" && (
            <View style={styles.mainContent}>
              {/* Pulsing Empty Heart Visual */}
              <Animated.View
                style={[
                  styles.heartVisualBadge,
                  { transform: [{ scale: pulseHeartAnim }] },
                ]}
              >
                <Ionicons name="heart-dislike" size={48} color={colors.danger} />
              </Animated.View>

              {/* Alert Title */}
              <Text style={styles.modalTitle}>{title}</Text>

              {/* Custom Alert Message */}
              <View style={styles.alertNoticeBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={styles.alertNoticeText}>{message}</Text>
              </View>

              {/* Current Hearts Display (0/5) */}
              <View style={styles.heartsStatusRow}>
                <Text style={styles.heartsStatusLabel}>Current Lives:</Text>
                <View style={styles.miniHearts}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons
                      key={i}
                      name="heart"
                      size={18}
                      color={i <= stats.lives ? colors.danger : "#E0DADA"}
                      style={{ marginHorizontal: 2 }}
                    />
                  ))}
                  <Text style={styles.livesNumText}>({stats.lives}/5)</Text>
                </View>
              </View>

              {/* Error feedback notice if not enough gems/coins */}
              {feedbackNotice && (
                <View style={styles.errorNoticeBox}>
                  <Ionicons name="information-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorNoticeText}>{feedbackNotice}</Text>
                </View>
              )}

              {/* Options Header */}
              <Text style={styles.optionsHeader}>CHOOSE REFILL OPTION</Text>

              {/* ── OPTION 1: WATCH ADS (FREE) ── */}
              <TouchableOpacity
                style={styles.optionCardPrimary}
                activeOpacity={0.82}
                onPress={handleStartWatchAd}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="play-circle" size={32} color={colors.primary} />
                </View>

                <View style={styles.optionTextContainer}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>Watch Short Ad</Text>
                    <View style={styles.freePill}>
                      <Text style={styles.freePillText}>FREE</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSubtitle}>Watch a 5-sec sponsor video for +1 Life</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* ── OPTION 2: SHOP WITH GEMS ── */}
              <TouchableOpacity
                style={styles.optionCardSecondary}
                activeOpacity={0.82}
                onPress={handleRefillWithGems}
                disabled={loadingAction === "gems"}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: "#EDF6FF" }]}>
                  <Ionicons name="diamond" size={26} color={colors.secondaryBlue} />
                </View>

                <View style={styles.optionTextContainer}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>Shop: Full Refill (5 ❤️)</Text>
                  </View>
                  <Text style={styles.optionSubtitle}>
                    Cost: 20 Gems · You have {stats.gems} 💎
                  </Text>
                </View>

                {loadingAction === "gems" ? (
                  <ActivityIndicator size="small" color={colors.secondaryBlue} />
                ) : (
                  <View
                    style={[
                      styles.priceBadge,
                      stats.gems < 20 && styles.priceBadgeDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priceBadgeText,
                        stats.gems < 20 && styles.priceBadgeTextDisabled,
                      ]}
                    >
                      20 💎
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── OPTION 3: SHOP WITH COINS ── */}
              <TouchableOpacity
                style={styles.optionCardSecondary}
                activeOpacity={0.82}
                onPress={handleRefillWithCoins}
                disabled={loadingAction === "coins"}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: "#FFF9DF" }]}>
                  <Ionicons name="star" size={26} color={colors.rewardOrange} />
                </View>

                <View style={styles.optionTextContainer}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>Shop: Full Refill (5 ❤️)</Text>
                  </View>
                  <Text style={styles.optionSubtitle}>
                    Cost: 50 Coins · You have {stats.coins} 🪙
                  </Text>
                </View>

                {loadingAction === "coins" ? (
                  <ActivityIndicator size="small" color={colors.rewardOrange} />
                ) : (
                  <View
                    style={[
                      styles.priceBadge,
                      stats.coins < 50 && styles.priceBadgeDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priceBadgeText,
                        stats.coins < 50 && styles.priceBadgeTextDisabled,
                      ]}
                    >
                      50 🪙
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Cancel / Dismiss */}
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.7}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 8, 25, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.largeCard,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: "center",
    ...shadows.cardSelected,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F2F6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  mainContent: {
    width: "100%",
    alignItems: "center",
  },
  heartVisualBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFEAEA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFD2D2",
    marginBottom: spacing.md,
    ...shadows.cardSelected,
  },
  modalTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  alertNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF2F2",
    borderRadius: radius.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FFCECE",
    marginBottom: spacing.md,
  },
  alertNoticeText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.dangerDark,
    flex: 1,
    lineHeight: 18,
  },
  heartsStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FAF9FC",
    borderRadius: radius.card,
    marginBottom: spacing.md,
  },
  heartsStatusLabel: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  miniHearts: {
    flexDirection: "row",
    alignItems: "center",
  },
  livesNumText: {
    ...typography.caption,
    fontWeight: "800",
    color: colors.textPrimary,
    marginLeft: 4,
  },
  errorNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    width: "100%",
    marginBottom: spacing.sm,
    gap: 6,
  },
  errorNoticeText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "600",
    flex: 1,
  },
  optionsHeader: {
    ...typography.tiny,
    letterSpacing: 1.2,
    color: colors.textMuted,
    fontWeight: "800",
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  optionCardPrimary: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#F5F2FF",
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    ...shadows.cardSelected,
  },
  optionCardSecondary: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#FAF9FC",
    borderWidth: 1,
    borderColor: "#EAE6F4",
    borderRadius: radius.card,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    //@ts-ignore
    ...shadows.buttonSecondary,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionTitle: {
    ...typography.body,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  freePill: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freePillText: {
    ...typography.tiny,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  optionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  priceBadgeDisabled: {
    backgroundColor: "#F0F0F0",
    borderColor: "#E0E0E0",
  },
  priceBadgeText: {
    ...typography.caption,
    fontWeight: "800",
    color: colors.primary,
  },
  priceBadgeTextDisabled: {
    color: colors.textMuted,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textMuted,
  },

  // ── Ad View Styles ──
  adPlayerContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  adHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C264D",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    marginBottom: spacing.md,
  },
  adHeaderBadgeText: {
    ...typography.tiny,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1,
  },
  adMockVideo: {
    width: "100%",
    height: 150,
    backgroundColor: "#1A1530",
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  adVideoIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  adVideoTitle: {
    ...typography.h3,
    color: "#FFF",
    fontWeight: "800",
  },
  adVideoSub: {
    ...typography.caption,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 3,
  },
  adProgressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "#EBE8F3",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  adProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  adCountdownText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  // ── Success View Styles ──
  successContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFEAEA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    position: "relative",
  },
  plusOneBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  plusOneText: {
    ...typography.caption,
    fontWeight: "900",
    color: "#FFF",
  },
  successTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  successSub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  heartsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.button,
    //@ts-ignore
    ...shadows.buttonPrimary,
  },
  primaryActionText: {
    ...typography.body,
    fontWeight: "800",
    color: "#FFF",
  },
});

export default NoLivesModal;
