// app/plans.tsx
// Subscription Plans Screen — Glassmorphism (REF: AGENTS.md / shop.tsx)

import { CustomAlertModal } from "@/components/CustomAlertModal";
import { useApp } from "@/context/AppContext";
import {
  cancelRazorpaySubscription,
  fetchSubscriptionEntitlement,
  startRazorpaySubscription,
  type RazorpayPlanCode,
  type SubscriptionEntitlement,
} from "@/services/razorpaySubscriptions";
import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ============================================================
   TYPES
============================================================ */

interface PlanFeature {
  icon?: string;
  label: string;
  title?: string;
  name?: string

}

interface PlanMetadata {
  features?: PlanFeature[] | string[];
  popular?: boolean;
  badge?: string;
  color?: string;
  description?: string;
  [key: string]: any;
}

interface SubscriptionPlan {
  id?: string;
  plan_id?: string;
  plan_code: string;
  name?: string;
  description?: string | null;
  amount_minor: number; // paise (INR × 100) or minor units
  currency_code: string;
  interval?: string;
  interval_count?: number;
  billing_provider: string;
  provider_plan_id?: string;
  provider_product_id?: string;
  metadata: PlanMetadata | null;
}

/* ============================================================
   COLORS (REF: AGENTS.md / LessonStartView)
============================================================ */

const COLORS = {
  background: "#F5F2FF",
  purple: "#6847F5",
  purpleDark: "#5135D4",
  purpleLight: "rgba(104,71,245,0.12)",
  text: "#111126",
  textSecondary: "#626078",
  textMuted: "#77738C",
  green: "#16C58B",
  gold: "#F7B718",
  cyan: "#3DCDE2",
  orange: "#FF9600",
  danger: "#FF4B4B",
  white: "#FFFFFF",
  glassBg: "rgba(104,71,245,0.035)",
  glassBgHigh: "rgba(104,71,245,0.06)",
  glassBorder: "rgba(104,71,245,0.16)",
  glassTopHighlight: "rgba(255,255,255,0.70)",
};

/* ============================================================
   HELPERS
============================================================ */

function formatPrice(amountMinor: number, currencyCode: string): string {
  const amount = amountMinor;
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = symbols[currencyCode.toUpperCase()] ?? currencyCode + " ";
  return `${symbol}${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}

function formatInterval(
  rawInterval?: string,
  intervalCount?: number,
  metadata?: PlanMetadata | null,
  planCode?: string
): string {
  const period = (
    metadata?.billing_period ??
    rawInterval ??
    (planCode?.toLowerCase().includes("year") ? "yearly" : "monthly")
  ).toLowerCase();

  const count = intervalCount ?? 1;

  if (period.includes("month")) {
    return `/ ${count === 1 ? "month" : `${count} months`}`;
  }
  if (period.includes("year")) {
    return `/ ${count === 1 ? "year" : `${count} years`}`;
  }
  if (period.includes("week")) {
    return `/ ${count === 1 ? "week" : `${count} weeks`}`;
  }
  return `/ ${period}`;
}

function getFeatureList(metadata: PlanMetadata | null): string[] {
  const defaultFeatures = [
    "Unlimited Hearts & Mistake Review",
    "Access to All Languages & Courses",
    "AI Speech & Pronunciation Feedback",
    "Ad-Free Immersive Learning",
  ];

  if (!metadata?.features) return defaultFeatures;
  const raw = metadata.features;

  if (Array.isArray(raw)) {
    const list = raw.map((f) =>
      typeof f === "string" ? f : f?.label ?? f?.title ?? f?.name ?? String(f)
    );
    return list.length > 0 ? list : defaultFeatures;
  }

  if (typeof raw === "object" && raw !== null) {
    if (Array.isArray((raw as any).list) && (raw as any).list.length > 0) {
      return (raw as any).list.map((f: any) =>
        typeof f === "string" ? f : f?.label ?? String(f)
      );
    }
    if (Array.isArray((raw as any).items) && (raw as any).items.length > 0) {
      return (raw as any).items.map((f: any) =>
        typeof f === "string" ? f : f?.label ?? String(f)
      );
    }

    const entries = Object.entries(raw);
    if (entries.length > 0) {
      return entries.map(([key, val]) => {
        if (typeof val === "string") return val;
        if (typeof val === "boolean" && val) {
          return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        }
        if (typeof val === "object" && val !== null) {
          return (val as any).label ?? (val as any).title ?? key;
        }
        return key;
      });
    }
  }
  //@ts-ignore
  if (typeof raw === "string" && raw.trim().length > 0) {
    //@ts-ignore
    return [raw.trim()];
  }

  return defaultFeatures;
}

/* ============================================================
   GLASS CARD COMPONENT
============================================================ */

interface GlassProps {
  children: React.ReactNode;
  style?: any;
  highlighted?: boolean;
}

const Glass: React.FC<GlassProps> = ({ children, style, highlighted }) => (
  <View
    style={[
      styles.glassCard,
      highlighted && styles.glassCardHighlighted,
      style,
    ]}
  >
    <View pointerEvents="none" style={styles.glassTopEdge} />
    {children}
  </View>
);

/* ============================================================
   PLAN CARD COMPONENT
============================================================ */

interface PlanCardProps {
  plan: SubscriptionPlan;
  onBuy: (plan: SubscriptionPlan) => void;
  purchasing: boolean;
  isCurrent?: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
}

function PlanCard({
  plan,
  onBuy,
  purchasing,
  isCurrent,
  onCancel,
  cancelling,
}: PlanCardProps) {
  const meta = plan.metadata ?? {};
  const isYearly =
    plan.plan_code.toLowerCase().includes("year") ||
    meta.billing_period?.toLowerCase() === "yearly";
  const isPopular = meta.popular === true || isYearly;
  const badge = isCurrent
    ? "Active Plan"
    : meta.badge ?? (isPopular ? (isYearly ? "Best Value" : "Most Popular") : null);
  const accentColor = isCurrent
    ? COLORS.green
    : meta.color ?? (isPopular ? COLORS.purple : COLORS.cyan);
  const features = getFeatureList(plan.metadata);
  const priceStr = formatPrice(plan.amount_minor, plan.currency_code);
  const intervalStr = formatInterval(
    plan.interval,
    plan.interval_count,
    plan.metadata,
    plan.plan_code
  );
  const planTitle =
    meta.title ?? plan.name ?? plan.plan_code.replace(/_/g, " ");

  return (
    <View style={styles.planCardWrapper}>
      {/* Popular / badge pill — floats above card */}
      {badge && (
        <View
          style={[
            styles.badgePill,
            { backgroundColor: accentColor, borderColor: `${accentColor}44` },
          ]}
        >
          {isPopular && !isCurrent && (
            <Ionicons name="star" size={10} color={COLORS.white} />
          )}
          {isCurrent && (
            <Ionicons name="checkmark-circle" size={11} color={COLORS.white} style={{ marginRight: 2 }} />
          )}
          <Text style={styles.badgePillText}>{badge}</Text>
        </View>
      )}

      <Glass
        highlighted={isPopular || isCurrent}
        style={[
          styles.planCard,
          (isPopular || isCurrent) && { borderColor: `${accentColor}55` },
        ]}
      >
        {/* Glow ring for popular / current */}
        {(isPopular || isCurrent) && (
          <View
            pointerEvents="none"
            style={[styles.popularGlow, { backgroundColor: `${accentColor}0D` }]}
          />
        )}

        {/* Plan name + description */}
        <Text style={styles.planName}>{planTitle}</Text>
        {(meta.description ?? plan.description) ? (
          <Text style={styles.planDescription}>
            {meta.description ?? plan.description}
          </Text>
        ) : null}

        {/* Price block */}
        <View style={styles.priceRow}>
          <Text style={[styles.priceAmount, (isPopular || isCurrent) && { color: accentColor }]}>
            {priceStr}
          </Text>
          <Text style={styles.priceInterval}>{intervalStr}</Text>
        </View>

        {/* Feature list */}
        {features.length > 0 && (
          <View style={styles.featureList}>
            {features.map((f, idx) => (
              <View key={idx} style={styles.featureRow}>
                <View
                  style={[
                    styles.featureCheckPod,
                    { backgroundColor: `${accentColor}18` },
                  ]}
                >
                  <Ionicons name="checkmark" size={12} color={accentColor} />
                </View>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Actions */}
        {isCurrent ? (
          <View style={styles.actionButtonGroup}>
            {/* Active Plan Indicator Button */}
            <View style={[styles.buyButton, styles.activePlanButton]}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
              <Text style={styles.buyButtonText}>Active Plan</Text>
            </View>

            {/* Cancel Plan Button */}
            {onCancel && (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={cancelling}
                onPress={onCancel}
                style={styles.cancelPlanBtn}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={COLORS.danger} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
                    <Text style={styles.cancelPlanBtnText}>Cancel Plan</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* Buy / Subscribe button */
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={purchasing}
            onPress={() => onBuy(plan)}
            style={[
              styles.buyButton,
              { backgroundColor: accentColor },
              purchasing && styles.buyButtonLoading,
            ]}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="flash" size={16} color={COLORS.white} />
                <Text style={styles.buyButtonText}>Subscribe — {priceStr}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Plan code badge */}
        <Text style={styles.planCodeText}>{plan.plan_code}</Text>
      </Glass>
    </View>
  );
}

/* ============================================================
   PLANS SCREEN
============================================================ */

export default function PlansScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { refreshStats, refreshEntitlement } = useApp();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // ─────────────────────────────────────────────────────────
  // LOAD PLANS & ENTITLEMENT
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc(
        "get_active_subscription_plans",
        { p_billing_provider: "razorpay" }
      );

      if (rpcErr) {
        console.error("[PlansScreen] Failed to load plans:", rpcErr.message);
        setError(rpcErr.message || "Failed to load plans.");
        return;
      }

      console.log("[PlansScreen] Plans loaded:", data);
      setPlans((data as SubscriptionPlan[]) ?? []);

      // Fetch entitlement status in background
      try {
        const ent = await fetchSubscriptionEntitlement(supabase);
        console.log("[PlansScreen] Entitlement loaded:", ent);
        setEntitlement(ent);
      } catch (entErr) {
        console.log("[PlansScreen] Entitlement check skipped:", entErr);
      }
    } catch (e: any) {
      console.error("[PlansScreen] Exception:", e);
      setError(e?.message ?? "Unexpected error loading plans.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // HANDLE PURCHASE (Razorpay Native Subscriptions)
  // ─────────────────────────────────────────────────────────

  async function handleBuy(plan: SubscriptionPlan) {
    const activeId = plan.id ?? plan.plan_id ?? plan.plan_code;
    setPurchasingPlanId(activeId);
    setSuccessMsg(null);
    setError(null);

    try {
      const planCode: RazorpayPlanCode =
        plan.plan_code === "PREMIUM_YEARLY" || plan.plan_code.toLowerCase().includes("year")
          ? "PREMIUM_YEARLY"
          : "PREMIUM_MONTHLY";

      console.log("[PlansScreen] Initiating startRazorpaySubscription with code:", planCode);

      const result = await startRazorpaySubscription(
        supabase,
        planCode,
        "The Geniuss"
      );

      console.log("[PlansScreen] Subscription flow completed successfully:", result);

      setEntitlement(result.entitlement);
      setShowAllPlans(false);
      setSuccessMsg(
        result.verification.message ?? "🎉 Welcome to Premium! Your subscription is now active."
      );

      // Refresh global app stats (hearts, gems, status)
      try {
        await refreshStats();
      } catch (syncErr) {
        console.warn("[PlansScreen] refreshStats error:", syncErr);
      }
    } catch (e: any) {
      console.error("[PlansScreen] handleBuy error:", e);
      const msg = e?.description ?? e?.message ?? String(e);

      // Detect user cancellation / modal dismissal
      if (
        e?.code === 0 ||
        e?.code === 2 ||
        /cancel/i.test(msg) ||
        /dismiss/i.test(msg)
      ) {
        setError("Payment was cancelled.");
      } else {
        setError(msg || "Unexpected error during purchase.");
      }
    } finally {
      setPurchasingPlanId(null);
    }
  }

  // ─────────────────────────────────────────────────────────
  // HANDLE CANCEL SUBSCRIPTION
  // ─────────────────────────────────────────────────────────

  async function handleCancelSubscription() {
    setConfirmCancelVisible(false);
    setIsCancelling(true);
    setError(null);
    setSuccessMsg(null);

    try {
      console.log("[PlansScreen] Cancelling subscription:", entitlement?.subscriptionId);
      await cancelRazorpaySubscription(
        supabase,
        entitlement?.subscriptionId,
        true
      );

      setSuccessMsg(
        "Subscription cancelled successfully. You retain full premium benefits until the end of your billing cycle."
      );

      // Refresh entitlement
      try {
        const updatedEnt = await fetchSubscriptionEntitlement(supabase);
        setEntitlement(updatedEnt);
      } catch (e) {
        console.warn("[PlansScreen] Could not refresh entitlement after cancel:", e);
      }

      // Refresh global app stats
      try {
        await refreshStats();
      } catch (e) {}
    } catch (e: any) {
      console.error("[PlansScreen] Cancel subscription error:", e);
      setError(e?.message ?? "Failed to cancel subscription. Please contact support.");
    } finally {
      setIsCancelling(false);
    }
  }

  // Active plan lookup
  const activePlan = plans.find((p) => {
    const planCode = p.plan_code.toLowerCase();
    const entPlan = (entitlement?.plan ?? "").toLowerCase();
    return (
      planCode === entPlan ||
      (planCode.includes("year") && entPlan.includes("year")) ||
      (planCode.includes("month") && entPlan.includes("month"))
    );
  }) ?? plans[0];

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* SKIA AMBIENT BACKGROUND */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={["#F5F2FF", "#F0EDFF", "#F8F8FF", "#EEF9F7"]}
          />
        </Rect>
        <Circle cx={width * 0.88} cy={height * 0.12} r={width * 0.58} color="rgba(111,82,245,0.13)" />
        <Circle cx={-width * 0.06} cy={height * 0.76} r={width * 0.54} color="rgba(61,205,226,0.12)" />
        <Circle cx={width * 0.80} cy={height * 0.95} r={width * 0.45} color="rgba(112,87,245,0.09)" />
      </Canvas>

      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.75}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {entitlement?.isPremium && !showAllPlans ? "Your Subscription" : "Choose Your Plan"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {entitlement?.isPremium && !showAllPlans ? "Manage your membership" : "Unlock everything. Cancel anytime."}
            </Text>
          </View>

          {/* spacer for symmetry */}
          <View style={{ width: 38 }} />
        </View>

        {/* Hero badge */}
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="diamond" size={14} color={COLORS.purple} />
            <Text style={styles.heroBadgeText}>Powered by Razorpay</Text>
          </View>
        </View>

        {/* CONTENT */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Active subscription banner */}
          {entitlement?.isPremium && (
            <Glass style={styles.activeBannerCard}>
              <View style={styles.activeBannerRow}>
                <View style={styles.activeBannerIconPod}>
                  <Ionicons name="sparkles" size={18} color={COLORS.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeBannerTitle}>
                    Lingue Premium Active {entitlement.plan ? `• ${entitlement.plan}` : ""}
                  </Text>
                  <Text style={styles.activeBannerSub}>
                    {entitlement.expiresAt
                      ? `Valid until ${new Date(entitlement.expiresAt).toLocaleDateString()}`
                      : "All features and lessons unlocked. Keep learning!"}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowAllPlans(!showAllPlans)}
                  style={styles.activeBannerChangeBtn}
                >
                  <Text style={styles.activeBannerChangeText}>
                    {showAllPlans ? "Active Plan" : "Change Plan"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Glass>
          )}

          {/* Inline feedback banners */}
          {error && (
            <Glass style={styles.feedbackCard}>
              <View style={styles.feedbackRow}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                <Text style={styles.feedbackError}>{error}</Text>
              </View>
              <TouchableOpacity onPress={loadPlans} style={styles.retryBtn}>
                <Ionicons name="refresh" size={14} color={COLORS.purple} />
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </Glass>
          )}

          {successMsg && (
            <Glass style={styles.feedbackCard}>
              <View style={styles.feedbackRow}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.green} />
                <Text style={styles.feedbackSuccess}>{successMsg}</Text>
              </View>
            </Glass>
          )}

          {/* LOADING */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.purple} />
              <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
          )}

          {/* EMPTY */}
          {!isLoading && plans.length === 0 && !error && (
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No plans available right now.</Text>
            </View>
          )}

          {/* VIEW 1: ACTIVE PLAN ONLY (When user is subscribed & hasn't tapped Change Plan) */}
          {!isLoading && entitlement?.isPremium && !showAllPlans && activePlan && (
            <View>
              <PlanCard
                key={activePlan.id ?? activePlan.plan_id ?? activePlan.plan_code}
                plan={activePlan}
                purchasing={false}
                isCurrent={true}
                cancelling={isCancelling}
                onBuy={handleBuy}
                onCancel={() => setConfirmCancelVisible(true)}
              />

              {/* Small button to change the plan -> shows all plans */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowAllPlans(true)}
                style={styles.changePlanBtn}
              >
                <Ionicons name="swap-horizontal" size={16} color={COLORS.purple} />
                <Text style={styles.changePlanBtnText}>Change Plan</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.purple} />
              </TouchableOpacity>
            </View>
          )}

          {/* VIEW 2: ALL PLANS LIST (When user has no active plan OR clicked "Change Plan") */}
          {!isLoading && (!entitlement?.isPremium || showAllPlans) && (
            <View>
              {showAllPlans && entitlement?.isPremium && (
                <View style={styles.allPlansHeaderBar}>
                  <View>
                    <Text style={styles.allPlansTitle}>All Available Plans</Text>
                    <Text style={styles.allPlansSubtitle}>Select a plan to switch or renew</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowAllPlans(false)}
                    style={styles.backToActiveBtn}
                  >
                    <Ionicons name="arrow-back" size={12} color={COLORS.purple} />
                    <Text style={styles.backToActiveBtnText}>View Active</Text>
                  </TouchableOpacity>
                </View>
              )}

              {plans.map((plan) => {
                const planKey = plan.id ?? plan.plan_id ?? plan.plan_code;
                const isCurrent =
                  Boolean(entitlement?.isPremium) &&
                  (entitlement?.plan?.toUpperCase() === plan.plan_code.toUpperCase() ||
                    (plan.plan_code.toLowerCase().includes("year") &&
                      entitlement?.plan?.toLowerCase().includes("year")) ||
                    (plan.plan_code.toLowerCase().includes("month") &&
                      entitlement?.plan?.toLowerCase().includes("month")));

                return (
                  <PlanCard
                    key={planKey}
                    plan={plan}
                    purchasing={purchasingPlanId === planKey}
                    isCurrent={Boolean(isCurrent)}
                    cancelling={isCancelling}
                    onBuy={handleBuy}
                    onCancel={isCurrent ? () => setConfirmCancelVisible(true) : undefined}
                  />
                );
              })}
            </View>
          )}

          {/* Footer note */}
          {!isLoading && plans.length > 0 && (
            <View style={styles.footerNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.footerNoteText}>
                Secure payment via Razorpay. Subscription auto-renews. Cancel from your account anytime.
              </Text>
            </View>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Confirm Cancellation Modal */}
      <CustomAlertModal
        visible={confirmCancelVisible}
        type="warning"
        title="Cancel Subscription?"
        message="Are you sure you want to cancel your Lingue Premium plan? You will continue to have full access until your billing period ends."
        buttons={[
          {
            text: "Keep Subscription",
            style: "cancel",
            onPress: () => setConfirmCancelVisible(false),
          },
          {
            text: "Yes, Cancel Plan",
            style: "destructive",
            onPress: handleCancelSubscription,
          },
        ]}
        onClose={() => setConfirmCancelVisible(false)}
      />
    </View>
  );
}

/* ============================================================
   STYLES — STRICT GLASSMORPHISM (ZERO ELEVATION ON GLASS)
============================================================ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassBg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Hero badge
  heroBadgeRow: {
    alignItems: "center",
    paddingVertical: 14,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(104,71,245,0.07)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.purple,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Glass card base
  glassCard: {
    backgroundColor: COLORS.glassBg,
    borderWidth: 1.2,
    borderColor: COLORS.glassBorder,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  glassCardHighlighted: {
    backgroundColor: "rgba(104,71,245,0.055)",
    borderWidth: 1.5,
  },
  glassTopEdge: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: COLORS.glassTopHighlight,
    zIndex: 10,
  },

  // Plan card
  planCardWrapper: {
    marginBottom: 20,
  },
  planCard: {
    padding: 22,
  },
  popularGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  // Badge pill (floats above card)
  badgePill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: -14,
    zIndex: 10,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: 0.3,
  },

  // Plan info
  planName: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  planDescription: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  // Price
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 16,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -1,
    lineHeight: 40,
  },
  priceInterval: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  // Features
  featureList: {
    marginTop: 16,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureCheckPod: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },

  // Divider
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.glassBorder,
    marginVertical: 18,
  },

  // Buy button
  buyButton: {
    height: 52,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buyButtonLoading: {
    opacity: 0.75,
  },
  buyButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: -0.2,
  },

  // Plan code watermark
  planCodeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 0.5,
  },

  // Feedback banners
  feedbackCard: {
    padding: 14,
    marginBottom: 16,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedbackError: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.danger,
  },
  feedbackSuccess: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.green,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.purple,
  },

  // Loading / Empty
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  // Footer note
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    lineHeight: 16,
  },

  // Active Subscription Banner
  activeBannerCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: "rgba(22,197,139,0.06)",
    borderColor: "rgba(22,197,139,0.28)",
  },
  activeBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activeBannerIconPod: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(247,183,24,0.12)",
    borderWidth: 1,
    borderColor: "rgba(247,183,24,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  activeBannerSub: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeBannerChangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(104,71,245,0.10)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  activeBannerChangeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.purple,
  },

  // Actions on Plan Card
  actionButtonGroup: {
    width: "100%",
  },
  activePlanButton: {
    backgroundColor: COLORS.green,
    opacity: 0.95,
  },
  cancelPlanBtn: {
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(255,75,75,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,75,75,0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  cancelPlanBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.danger,
    letterSpacing: -0.2,
  },

  // Change Plan Button (Small button in active-only mode)
  changePlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 16,
    alignSelf: "center",
  },
  changePlanBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.purple,
    letterSpacing: -0.2,
  },

  // All plans header when switching
  allPlansHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  allPlansTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  allPlansSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  backToActiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  backToActiveBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.purple,
  },
});
