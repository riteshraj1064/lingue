// app/(tabs)/shop.tsx

import { CustomAlertButton, CustomAlertModal } from "@/components/CustomAlertModal";
import { ScreenContainer } from "@/components/ScreenContainer";
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useApp } from "../../context/AppContext";

/* ============================================================
   TYPES
============================================================ */

export interface ShopItem {
  id: number;
  code: string;
  name: string;
  description: string;
  item_type: string;
  gem_price: number;
  icon_url: string | null;
  metadata: any;
}

/* ============================================================
   COLOR PALETTE (REF: LessonStartView / Profile)
============================================================ */

const COLORS = {
  background: "#F5F2FF",
  purple: "#6847F5",
  purpleDark: "#5135D4",
  text: "#111126",
  textSecondary: "#626078",
  textMuted: "#77738C",
  green: "#16C58B",
  gold: "#F7B718",
  cyan: "#3DCDE2",
  orange: "#FF9600",
  danger: "#FF4B4B",
  white: "#FFFFFF",
};

/* ============================================================
   TRANSLUCENT GLASS CARD COMPONENT
============================================================ */

interface GlassProps {
  children: React.ReactNode;
  style?: any;
}

const Glass: React.FC<GlassProps> = ({ children, style }) => {
  return (
    <View style={[styles.glassCard, style]}>
      <View pointerEvents="none" style={styles.glassTopEdge} />
      <View style={styles.glassContent}>{children}</View>
    </View>
  );
};

/* ============================================================
   SHOP SCREEN COMPONENT
============================================================ */

export default function ShopScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { stats, refreshStats } = useApp();

  const isNarrow = width < 360;
  const horizontalPadding = isNarrow ? 10 : 12;

  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [purchasingItemId, setPurchasingItemId] = useState<number | null>(null);

  /* Alert State */
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: "info" | "success" | "warning" | "error" | "confirm";
    buttons?: CustomAlertButton[];
  }>({
    visible: false,
    title: "",
  });

  const showAlert = (
    title: string,
    message?: string,
    type: "info" | "success" | "warning" | "error" | "confirm" = "info",
    buttons?: CustomAlertButton[]
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      buttons,
    });
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_shop");
        if (error) {
          console.log("error in fetch data shop", error);
          return;
        }
        if (data) {
          console.log("data from fetch data shop", data);
          setItems(data?.items as ShopItem[]);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  function generateRequestId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const handlePurchase = async (item: ShopItem) => {
    if (stats.gems < item.gem_price) {
      showAlert(
        "Not Enough Gems",
        `You need ${item.gem_price} gems to buy ${item.name}.`,
        "warning"
      );
      return;
    }

    setPurchasingItemId(item.id);
    try {
      const requestId = generateRequestId();

      const { data, error } = await supabase.rpc("buy_shop_item", {
        p_item_id: item.id,
        p_quantity: 1,
        p_request_id: requestId,
      });

      if (error) {
        console.error("buy_shop_item RPC error:", error);
        showAlert(
          "Purchase Failed",
          error.message || "Failed to process purchase. Please try again.",
          "error"
        );
        return;
      }

      console.log("buy_shop_item response data:", data);

      if (data && typeof data === "object" && "success" in data && !data.success) {
        showAlert(
          "Purchase Failed",
          data.message || data.error || "Failed to process purchase.",
          "error"
        );
        return;
      }

      await refreshStats();

      const successMsg =
        (typeof data === "object" && data?.message) ||
        `You bought ${item.name} for ${item.gem_price} gems!`;

      showAlert("Purchase Successful", successMsg, "success");
    } catch (err: any) {
      console.error("Error during purchase:", err);
      showAlert(
        "Purchase Failed",
        err?.message || "An unexpected error occurred during purchase.",
        "error"
      );
    } finally {
      setPurchasingItemId(null);
    }
  };

  const getIconProps = (
    type: string
  ): { name: any; color: string; bgColor: string; borderColor: string } => {
    switch (type) {
      case "HEART_REFILL":
        return {
          name: "heart",
          color: COLORS.danger,
          bgColor: "rgba(255,75,75,0.10)",
          borderColor: "rgba(255,75,75,0.25)",
        };
      case "STREAK_FREEZE":
        return {
          name: "snow",
          color: COLORS.cyan,
          bgColor: "rgba(61,205,226,0.10)",
          borderColor: "rgba(61,205,226,0.25)",
        };
      case "XP_BOOST":
        return {
          name: "flash",
          color: COLORS.gold,
          bgColor: "rgba(247,183,24,0.10)",
          borderColor: "rgba(247,183,24,0.25)",
        };
      default:
        return {
          name: "cube",
          color: COLORS.purple,
          bgColor: "rgba(104,71,245,0.10)",
          borderColor: "rgba(104,71,245,0.25)",
        };
    }
  };

  return (
    <ScreenContainer
      scrollable={false}
      backgroundColor={COLORS.background}
      withBottomPadding={false}
      edges={["top"]}
      contentContainerStyle={{ paddingHorizontal: 0 }}
    >
      <View style={styles.screen}>
        {/* SKIA VISUAL BACKGROUND */}
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width, height)}
              colors={["#F5F2FF", "#F0EDFF", "#F8F8FF", "#EEF9F7"]}
            />
          </Rect>

          <Circle
            cx={width * 0.88}
            cy={height * 0.13}
            r={width * 0.57}
            color="rgba(111,82,245,0.14)"
          />

          <Circle
            cx={-width * 0.05}
            cy={height * 0.78}
            r={width * 0.55}
            color="rgba(61,205,226,0.13)"
          />

          <Circle
            cx={width * 0.8}
            cy={height * 0.94}
            r={width * 0.46}
            color="rgba(112,87,245,0.10)"
          />
        </Canvas>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
          ]}
        >
          {/* HEADER WITH SHOP HISTORY BUTTON */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitleText}>Shop</Text>
              <Text style={styles.headerSubtitleText}>Power-ups & Boosts</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => router.push("/shop-history")}
              style={styles.historyBtn}
            >
              <Ionicons name="time-outline" size={17} color={COLORS.purple} />
              <Text style={styles.historyBtnText}>History</Text>
            </TouchableOpacity>
          </View>

          {/* HERO BALANCES BANNER */}
          <Glass style={styles.heroBannerGlass}>
            <View style={styles.heroBannerRow}>
              <View style={styles.balanceItem}>
                <View style={[styles.balanceIconPod, styles.goldPod]}>
                  <Ionicons name="diamond" size={20} color={COLORS.gold} />
                </View>
                <Text style={styles.balanceValue}>{stats?.gems ?? 0}</Text>
                <Text style={styles.balanceLabel}>Gems Available</Text>
              </View>

              <View style={styles.bannerDivider} />

              <View style={styles.balanceItem}>
                <View style={[styles.balanceIconPod, styles.dangerPod]}>
                  <Ionicons name="heart" size={20} color={COLORS.danger} />
                </View>
                <Text style={styles.balanceValue}>{stats?.lives ?? 5}/5</Text>
                <Text style={styles.balanceLabel}>Current Lives</Text>
              </View>
            </View>
          </Glass>

          {/* SHOP ITEMS SECTION */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeading}>
              <View style={[styles.headingIconPod, styles.purplePod]}>
                <Ionicons name="cart" size={18} color={COLORS.purple} />
              </View>
              <Text style={styles.sectionTitleText}>Power-ups & Refills</Text>
            </View>
          </View>

          <View style={styles.itemsList}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.purple} />
                <Text style={styles.loadingText}>Loading shop items...</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bag-handle-outline" size={44} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No items available in shop.</Text>
              </View>
            ) : (
              items.map((item) => {
                const iconProps = getIconProps(item.item_type);
                const canAfford = stats.gems >= item.gem_price;

                const isPurchasing = purchasingItemId === item.id;
                const isDisabled = !canAfford || isPurchasing;

                return (
                  <Glass key={item.id} style={styles.itemCardGlass}>
                    <View style={styles.cardRow}>
                      <View
                        style={[
                          styles.iconContainerOuter,
                          { borderColor: iconProps.borderColor },
                        ]}
                      >
                        <View
                          style={[
                            styles.iconContainerInner,
                            { backgroundColor: iconProps.bgColor },
                          ]}
                        >
                          <Ionicons
                            name={iconProps.name}
                            size={26}
                            color={iconProps.color}
                          />
                        </View>
                      </View>

                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemDesc}>{item.description}</Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.78}
                        disabled={isDisabled}
                        style={[
                          styles.buyButton,
                          isDisabled && styles.buyButtonDisabled,
                        ]}
                        onPress={() => handlePurchase(item)}
                      >
                        {isPurchasing ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <>
                            <Ionicons
                              name="diamond"
                              size={14}
                              color={canAfford ? COLORS.white : COLORS.textMuted}
                            />
                            <Text
                              style={[
                                styles.buyButtonText,
                                !canAfford && styles.buyButtonTextDisabled,
                              ]}
                            >
                              {item.gem_price}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </Glass>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* CUSTOM GLASS ALERT MODAL */}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingTop: 8,
    paddingBottom: 36,
  },

  glassCard: {
    position: "relative",
    overflow: "hidden",
    marginBottom: 12,
    borderRadius: 22,
    backgroundColor: "rgba(104,71,245,0.035)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.16)",
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

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  headerLeft: {
    flex: 1,
  },

  headerTitleText: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.8,
  },

  headerSubtitleText: {
    marginTop: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "rgba(104,71,245,0.07)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.20)",
    gap: 5,
  },

  historyBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: COLORS.purple,
  },

  heroBannerGlass: {
    padding: 16,
    marginBottom: 14,
  },

  heroBannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  balanceItem: {
    flex: 1,
    alignItems: "center",
  },

  balanceIconPod: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
  },

  goldPod: {
    backgroundColor: "rgba(247,183,24,0.10)",
    borderColor: "rgba(247,183,24,0.25)",
  },

  dangerPod: {
    backgroundColor: "rgba(255,75,75,0.10)",
    borderColor: "rgba(255,75,75,0.25)",
  },

  purplePod: {
    backgroundColor: "rgba(104,71,245,0.08)",
    borderColor: "rgba(104,71,245,0.20)",
  },

  balanceValue: {
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.text,
  },

  balanceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  bannerDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(104,71,245,0.10)",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
  },

  headingIconPod: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 1,
  },

  sectionTitleText: {
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.4,
  },

  itemsList: {
    gap: 10,
  },

  itemCardGlass: {
    padding: 14,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainerOuter: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.3,
    marginRight: 12,
  },

  iconContainerInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  itemInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },

  itemName: {
    fontSize: 15.5,
    fontWeight: "800",
    color: COLORS.text,
  },

  itemDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.purple,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    gap: 5,
  },

  buyButtonDisabled: {
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
  },

  buyButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.white,
  },

  buyButtonTextDisabled: {
    color: COLORS.textMuted,
  },

  loadingContainer: {
    paddingVertical: 30,
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },

  emptyText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
});