// app/shop-history.tsx

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
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

/* ============================================================
   TYPES
============================================================ */

export interface ShopItemMeta {
  id?: number;
  name?: string;
  code?: string;
  item_type?: string;
  description?: string;
  gem_price?: number;
  [key: string]: any;
}

export interface ShopTransaction {
  id: string;
  created_at: string;
  shop_item_id: number;
  quantity: number;
  total_cost: number;
  request_id: string;
  user_id: string;
  item?: ShopItemMeta | null;
}

/* ============================================================
   COLOR PALETTE (REF: AGENTS.md / Shop)
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
   HELPERS
============================================================ */

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const dateFormatted = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
    const timeFormatted = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return isToday ? `Today • ${timeFormatted}` : `${dateFormatted} • ${timeFormatted}`;
  } catch {
    return dateStr;
  }
}

function getTransactionIconProps(itemType?: string, itemCode?: string) {
  const type = (itemType || itemCode || "").toUpperCase();
  if (type.includes("HEART") || type.includes("LIFE")) {
    return {
      name: "heart" as const,
      color: COLORS.danger,
      bgColor: "rgba(255,75,75,0.10)",
      borderColor: "rgba(255,75,75,0.25)",
    };
  }
  if (type.includes("FREEZE") || type.includes("SNOW") || type.includes("STREAK")) {
    return {
      name: "snow" as const,
      color: COLORS.cyan,
      bgColor: "rgba(61,205,226,0.10)",
      borderColor: "rgba(61,205,226,0.25)",
    };
  }
  if (type.includes("XP") || type.includes("BOOST") || type.includes("DOUBLE")) {
    return {
      name: "flash" as const,
      color: COLORS.gold,
      bgColor: "rgba(247,183,24,0.10)",
      borderColor: "rgba(247,183,24,0.25)",
    };
  }
  return {
    name: "bag-check" as const,
    color: COLORS.purple,
    bgColor: "rgba(104,71,245,0.10)",
    borderColor: "rgba(104,71,245,0.25)",
  };
}

/* ============================================================
   SHOP HISTORY SCREEN
============================================================ */

const PAGE_SIZE = 10;

export default function ShopHistory() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const isNarrow = width < 360;
  const horizontalPadding = isNarrow ? 10 : 14;

  const [history, setHistory] = useState<ShopTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalGemsSpent, setTotalGemsSpent] = useState<number>(0);

  const fetchHistory = useCallback(
    async (targetPage: number, isRefresh: boolean = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (targetPage > 1) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const { data, error } = await supabase.rpc(
          "get_shop_purchase_transactions",
          {
            p_page: targetPage,
            p_page_size: PAGE_SIZE,
          }
        );

        if (error) {
          console.error("Error fetching shop history:", error);
          return;
        }

        if (data) {
          console.log("Shop history RPC response:", data);
          const rawItems: ShopTransaction[] = Array.isArray(data.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];

          setHistory((prev) =>
            targetPage === 1 ? rawItems : [...prev, ...rawItems]
          );

          setHasMore(Boolean(data.has_more));
          setTotalCount(data.total_count ?? rawItems.length);
          setPage(targetPage);

          if (targetPage === 1) {
            const sum = rawItems.reduce(
              (acc, item) => acc + (item.total_cost || 0),
              0
            );
            setTotalGemsSpent(sum);
          } else {
            setTotalGemsSpent((prev) =>
              prev +
              rawItems.reduce((acc, item) => acc + (item.total_cost || 0), 0)
            );
          }
        }
      } catch (err) {
        console.error("Shop history unexpected error:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const handleRefresh = () => {
    fetchHistory(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading && !isRefreshing) {
      fetchHistory(page + 1);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Navigation Row */}
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.titleText}>Purchase History</Text>
          <Text style={styles.subtitleText}>Your shop transaction records</Text>
        </View>
      </View>

      {/* Summary Glass Banner */}
      <Glass style={styles.summaryBanner}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconPod, styles.purplePod]}>
              <Ionicons name="receipt" size={19} color={COLORS.purple} />
            </View>
            <Text style={styles.summaryValue}>{totalCount}</Text>
            <Text style={styles.summaryLabel}>Purchases</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconPod, styles.goldPod]}>
              <Ionicons name="diamond" size={19} color={COLORS.gold} />
            </View>
            <Text style={styles.summaryValue}>{totalGemsSpent}</Text>
            <Text style={styles.summaryLabel}>Gems Spent</Text>
          </View>
        </View>
      </Glass>

      <Text style={styles.sectionHeaderTitle}>Recent Transactions</Text>
    </View>
  );

  const renderItem = ({ item }: { item: ShopTransaction }) => {
    const itemMeta = item.item || {};
    const itemName = itemMeta.name || `Item #${item.shop_item_id}`;
    const itemDesc = itemMeta.description || null;
    const iconProps = getTransactionIconProps(
      itemMeta.item_type,
      itemMeta.code
    );
    const dateFormatted = formatDate(item.created_at);

    return (
      <Glass style={styles.transactionCardGlass}>
        <View style={styles.cardRow}>
          {/* Icon Pod */}
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
                size={24}
                color={iconProps.color}
              />
            </View>
          </View>

          {/* Details */}
          <View style={styles.itemDetails}>
            <View style={styles.itemNameRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {itemName}
              </Text>
              {item.quantity > 1 && (
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyBadgeText}>x{item.quantity}</Text>
                </View>
              )}
            </View>

            {itemDesc ? (
              <Text style={styles.itemDesc} numberOfLines={1}>
                {itemDesc}
              </Text>
            ) : null}

            <Text style={styles.dateText}>{dateFormatted}</Text>
          </View>

          {/* Cost Badge */}
          <View style={styles.costBadgeContainer}>
            <Ionicons name="diamond" size={13} color={COLORS.gold} />
            <Text style={styles.costText}>-{item.total_cost}</Text>
          </View>
        </View>
      </Glass>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={{ height: 30 }} />;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={COLORS.purple} />
        <Text style={styles.footerLoadingText}>Loading older purchases...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconPod}>
          <Ionicons name="receipt-outline" size={42} color={COLORS.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Purchases Yet</Text>
        <Text style={styles.emptySubtitle}>
          Your item purchase history will appear here once you buy power-ups from the shop.
        </Text>
      </View>
    );
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
            cy={height * 0.12}
            r={width * 0.55}
            color="rgba(111,82,245,0.13)"
          />

          <Circle
            cx={-width * 0.05}
            cy={height * 0.75}
            r={width * 0.55}
            color="rgba(61,205,226,0.12)"
          />

          <Circle
            cx={width * 0.8}
            cy={height * 0.92}
            r={width * 0.45}
            color="rgba(112,87,245,0.09)"
          />
        </Canvas>

        {isLoading ? (
          <View style={styles.loadingScreenContainer}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingScreenText}>Loading purchase history...</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: horizontalPadding },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.purple}
                colors={[COLORS.purple]}
              />
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },

  glassCard: {
    position: "relative",
    overflow: "hidden",
    marginBottom: 10,
    borderRadius: 20,
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

  headerContainer: {
    marginBottom: 14,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 2,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(104,71,245,0.07)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.20)",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  titleText: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
  },

  subtitleText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  summaryBanner: {
    padding: 14,
    marginBottom: 16,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryIconPod: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
  },

  purplePod: {
    backgroundColor: "rgba(104,71,245,0.08)",
    borderColor: "rgba(104,71,245,0.20)",
  },

  goldPod: {
    backgroundColor: "rgba(247,183,24,0.10)",
    borderColor: "rgba(247,183,24,0.25)",
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(104,71,245,0.10)",
  },

  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.3,
    paddingHorizontal: 2,
    marginBottom: 4,
  },

  transactionCardGlass: {
    padding: 12,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainerOuter: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    marginRight: 12,
  },

  iconContainerInner: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  itemDetails: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },

  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  itemName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    flexShrink: 1,
  },

  qtyBadge: {
    backgroundColor: "rgba(104,71,245,0.10)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },

  qtyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.purple,
  },

  itemDesc: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  dateText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 3,
  },

  costBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(247,183,24,0.10)",
    borderWidth: 1,
    borderColor: "rgba(247,183,24,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },

  costText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },

  loadingScreenContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  loadingScreenText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  footerLoading: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },

  footerLoadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyIconPod: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(104,71,245,0.06)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },

  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});