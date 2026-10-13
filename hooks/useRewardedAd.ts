// hooks/useRewardedAd.ts
// Rewarded Ad hook — loads, shows, and tracks reward state
// Auto-skipped when user isPremium to prevent unnecessary ad loading

import { useApp } from "@/context/AppContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

/* ─────────────────────────────────────────────────────────────────
   AD UNIT IDs
───────────────────────────────────────────────────────────────── */

const PRODUCTION_REWARDED_ID = Platform.select({
  android: "ca-app-pub-9842032709789426/XXXXXXXXXX", // ← replace with your rewarded Android unit ID
  ios:     "ca-app-pub-9842032709789426/YYYYYYYYYY", // ← replace with your rewarded iOS unit ID
  default: TestIds.REWARDED,
});

const AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : (PRODUCTION_REWARDED_ID ?? TestIds.REWARDED);

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */

export type RewardedAdStatus =
  | "idle"       // not yet loaded
  | "loading"    // preloading in background
  | "ready"      // loaded, ready to show
  | "showing"    // currently displaying
  | "rewarded"   // user watched full ad — reward earned
  | "failed"     // load or show error
  | "skipped";   // user is premium — ads suppressed

export interface RewardedAdResult {
  /** Current status of the ad lifecycle */
  status: RewardedAdStatus;

  /** True when the ad is fully loaded and can be shown */
  isReady: boolean;

  /** True while the ad is loading in the background */
  isLoading: boolean;

  /** True once the user has earned the reward */
  isRewarded: boolean;

  /** Call this to show the rewarded ad (no-op if not ready or user is premium) */
  showAd: () => Promise<void>;

  /** Re-preload a fresh ad (useful after the previous one was consumed) */
  reloadAd: () => void;

  /** Error message, if load or show failed */
  error: string | null;
}

/* ─────────────────────────────────────────────────────────────────
   HOOK
───────────────────────────────────────────────────────────────── */

/**
 * useRewardedAd
 *
 * Manages the full AdMob rewarded ad lifecycle.
 *
 * Usage:
 * ```tsx
 * const { isReady, isRewarded, showAd, status } = useRewardedAd({
 *   onRewarded: (type, amount) => grantBonusXP(amount),
 * });
 * ```
 */
export function useRewardedAd(options?: {
  unitId?: string;
  /** Called immediately when the reward is earned (before ad closes) */
  onRewarded?: (type: string, amount: number) => void;
  /** Called when the ad is closed (regardless of reward) */
  onClosed?: () => void;
  /** Called on ad load/show failure */
  onFailed?: (error: Error) => void;
}): RewardedAdResult {
  const { isPremium } = useApp();

  const unitId = options?.unitId ?? AD_UNIT_ID;

  const [status, setStatus] = useState<RewardedAdStatus>(
    isPremium ? "skipped" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to the current ad instance
  const adRef = useRef<RewardedAd | null>(null);
  // Cleanup listeners
  const unsubscribeRef = useRef<(() => void)[]>([]);

  const cleanup = useCallback(() => {
    unsubscribeRef.current.forEach((fn) => fn());
    unsubscribeRef.current = [];
    adRef.current = null;
  }, []);

  const createAndLoad = useCallback(() => {
    if (isPremium) {
      setStatus("skipped");
      return;
    }

    cleanup();
    setError(null);
    setStatus("loading");

    const ad = RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    adRef.current = ad;

    // ── event: ad loaded ──────────────────────────────────────────
    const unsubLoaded = ad.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setStatus("ready");
      }
    );

    // ── event: reward earned ──────────────────────────────────────
    const unsubEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        setStatus("rewarded");
        options?.onRewarded?.(reward.type, reward.amount);
      }
    );

    unsubscribeRef.current = [unsubLoaded, unsubEarned];

    ad.load();
  }, [isPremium, unitId, cleanup, options]);

  // ── Initial load ────────────────────────────────────────────────
  useEffect(() => {
    if (!isPremium) {
      createAndLoad();
    }
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  // ── Show the ad ─────────────────────────────────────────────────
  const showAd = useCallback(async () => {
    if (isPremium || !adRef.current || status !== "ready") return;

    try {
      setStatus("showing");
      await adRef.current.show();
      // onClosed fires after the ad modal closes (reward already set above)
      options?.onClosed?.();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error("[RewardedAd] Show error:", msg);
      setStatus("failed");
      setError(msg);
      options?.onFailed?.(e instanceof Error ? e : new Error(msg));
    }
  }, [isPremium, status, options]);

  // ── Reload for next use ─────────────────────────────────────────
  const reloadAd = useCallback(() => {
    createAndLoad();
  }, [createAndLoad]);

  return {
    status,
    isReady: status === "ready",
    isLoading: status === "loading",
    isRewarded: status === "rewarded",
    showAd,
    reloadAd,
    error,
  };
}
