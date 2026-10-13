// components/RewardedAdButton.tsx
// Glassmorphism Rewarded Ad Button Component
// Shows a "Watch Ad" CTA that triggers a rewarded AdMob ad.
// Automatically hidden when user isPremium.

import { useApp } from "@/context/AppContext";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* ─────────────────────────────────────────────────────────────────
   COLORS (matches AGENTS.md / shop.tsx / plans.tsx)
───────────────────────────────────────────────────────────────── */

const COLORS = {
  purple:    "#6847F5",
  text:      "#111126",
  textSecondary: "#626078",
  gold:      "#F7B718",
  green:     "#16C58B",
  danger:    "#FF4B4B",
  white:     "#FFFFFF",
  glassBg:   "rgba(104,71,245,0.04)",
  glassBorder: "rgba(104,71,245,0.16)",
  glassBgHigh: "rgba(104,71,245,0.08)",
};

/* ─────────────────────────────────────────────────────────────────
   PROPS
───────────────────────────────────────────────────────────────── */

interface RewardedAdButtonProps {
  /** Label shown on the CTA button (default: "Watch Ad for Reward") */
  label?: string;

  /** Sub-label shown below the button (e.g. "+ 1 ❤️ for watching") */
  rewardLabel?: string;

  /** Custom rewarded ad unit ID (optional, falls back to hook default) */
  unitId?: string;

  /** Called with (type, amount) when the user earns the reward */
  onRewarded?: (type: string, amount: number) => void;

  /** Called when the ad closes (regardless of reward) */
  onClosed?: () => void;

  /** If true, reload a fresh ad automatically after reward is earned */
  autoReload?: boolean;

  /** Custom styles for the outer wrapper */
  style?: any;
}

/* ─────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────── */

export const RewardedAdButton: React.FC<RewardedAdButtonProps> = ({
  label = "Watch Ad for Reward",
  rewardLabel,
  unitId,
  onRewarded,
  onClosed,
  autoReload = true,
  style,
}) => {
  const { isPremium } = useApp();

  const { isReady, isLoading, isRewarded, status, showAd, reloadAd, error } =
    useRewardedAd({
      unitId,
      onRewarded,
      onClosed: () => {
        onClosed?.();
        if (autoReload) {
          // Preload next ad after a short delay
          setTimeout(() => reloadAd(), 1500);
        }
      },
    });

  // Auto-reload when the previous ad was consumed
  useEffect(() => {
    if (isRewarded && autoReload) {
      const timer = setTimeout(() => reloadAd(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isRewarded, autoReload]);

  // Premium users don't see this at all
  if (isPremium) return null;

  /* ── States ─────────────────────────────────────────────────── */

  const isDisabled = !isReady || status === "showing";

  const buttonBg = isRewarded
    ? `${COLORS.green}18`
    : isDisabled
    ? COLORS.glassBg
    : COLORS.glassBgHigh;

  const buttonBorder = isRewarded
    ? `${COLORS.green}44`
    : isDisabled
    ? COLORS.glassBorder
    : `${COLORS.purple}55`;

  const iconName = isRewarded
    ? "checkmark-circle"
    : isLoading
    ? "hourglass-outline"
    : status === "showing"
    ? "play-circle"
    : status === "failed"
    ? "alert-circle-outline"
    : "play-circle-outline";

  const iconColor = isRewarded
    ? COLORS.green
    : status === "failed"
    ? COLORS.danger
    : isDisabled
    ? COLORS.textSecondary
    : COLORS.purple;

  const labelColor = isRewarded
    ? COLORS.green
    : status === "failed"
    ? COLORS.danger
    : isDisabled
    ? COLORS.textSecondary
    : COLORS.text;

  const displayLabel = isRewarded
    ? "Reward Earned! 🎉"
    : status === "showing"
    ? "Watching Ad…"
    : status === "failed"
    ? "Ad Unavailable"
    : isLoading
    ? "Loading Ad…"
    : label;

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <View style={[styles.wrapper, style]}>
      {/* Top highlight edge */}
      <View pointerEvents="none" style={styles.topEdge} />

      <TouchableOpacity
        activeOpacity={0.82}
        disabled={isDisabled}
        onPress={showAd}
        style={[
          styles.button,
          { backgroundColor: buttonBg, borderColor: buttonBorder },
          isDisabled && styles.buttonDisabled,
        ]}
      >
        {/* Left icon pod */}
        <View
          style={[
            styles.iconPod,
            {
              backgroundColor: isRewarded
                ? `${COLORS.green}18`
                : `${COLORS.gold}18`,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.gold} />
          ) : (
            <Ionicons name={iconName as any} size={18} color={iconColor} />
          )}
        </View>

        {/* Label */}
        <View style={styles.labelBlock}>
          <Text style={[styles.label, { color: labelColor }]}>
            {displayLabel}
          </Text>
          {rewardLabel && !isRewarded && (
            <Text style={styles.rewardLabel}>{rewardLabel}</Text>
          )}
        </View>

        {/* Right chevron */}
        {isReady && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={COLORS.purple}
            style={{ opacity: 0.7 }}
          />
        )}
      </TouchableOpacity>

      {/* Error message */}
      {error && status === "failed" && (
        <TouchableOpacity onPress={reloadAd} style={styles.retryRow}>
          <Ionicons name="refresh" size={12} color={COLORS.purple} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────────
   STYLES — ZERO ELEVATION ON GLASS (AGENTS.md Rule 15)
───────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
    position: "relative",
  },
  topEdge: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.70)",
    zIndex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  iconPod: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  labelBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111126",
  },
  rewardLabel: {
    fontSize: 12,
    color: "rgba(98,96,120,0.80)",
    fontWeight: "500",
  },
  retryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  retryText: {
    fontSize: 12,
    color: "#6847F5",
    fontWeight: "600",
  },
});

export default RewardedAdButton;
