// app/(tabs)/leaderboard.tsx

import GamificationBar from "@/components/GamificationBar";
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
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
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

export interface LeaderboardUser {
  avatar_url: string | null;
  full_name: string | null;
  rank: number;
  user_id: string;
  username: string | null;
  weekly_xp: number;
}

export interface LeaderboardResponse {
  has_more: boolean;
  page: number;
  page_size: number;
  rows: LeaderboardUser[];
  total_count: number;
  total_pages: number;
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
   HELPERS
============================================================ */

const getRankBadge = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

const getDisplayName = (item: LeaderboardUser, isUser: boolean) => {
  const name = item.full_name || item.username || "Learner";
  return isUser ? `${name} (You)` : name;
};

const getAvatarFallback = (item: LeaderboardUser) => {
  const name = item.full_name || item.username || "";
  if (name.length > 0) return name.charAt(0).toUpperCase();
  return "👤";
};

/* ============================================================
   LEADERBOARD SCREEN COMPONENT
============================================================ */

export default function LeaderboardScreen() {
  const { user } = useApp();
  const { width, height } = useWindowDimensions();

  const isNarrow = width < 360;
  const horizontalPadding = isNarrow ? 10 : 12;

  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [league, setLeague] = useState<any>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const loadLeague = async () => {
      const { data, error } = await supabase
        .rpc("get_current_user_league")
        .single();

      if (error) {
        console.error(error);
        return;
      }
      setLeague(data);
      //@ts-ignore
      setSecondsLeft(data?.ends_in_seconds || 0);
    };

    loadLeague();
  }, []);

  const formatCountdown = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;

    return `${minutes}m`;
  };

  const fetchLeaderboard = useCallback(
    async (targetPage: number, isRefresh = false) => {
      if (targetPage === 1 && !isRefresh) {
        setLoading(true);
      } else if (targetPage > 1) {
        setLoadingMore(true);
      }

      try {
        const { data, error } = await supabase.rpc("get_league_leaderboard", {
          p_page: targetPage,
          p_page_size: 10,
        });

        if (error) {
          console.error("Leaderboard RPC error:", error);
          return;
        }

        if (data) {
          const response = data as LeaderboardResponse;
          const newRows = response.rows || [];

          if (targetPage === 1) {
            setLeaders(newRows);
          } else {
            setLeaders((prev) => [...prev, ...newRows]);
          }

          setHasMore(response.has_more ?? false);
          setPage(targetPage);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!league) return;

    const interval = setInterval(() => {
      setSecondsLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [league]);

  useEffect(() => {
    fetchLeaderboard(1);
  }, [fetchLeaderboard]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard(1, true);
  }, [fetchLeaderboard]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading && !refreshing) {
      fetchLeaderboard(page + 1);
    }
  }, [hasMore, loadingMore, loading, refreshing, page, fetchLeaderboard]);

  /* Header Component */
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <GamificationBar />
      <Glass style={styles.leagueBannerGlass}>
        <View style={styles.leagueRow}>
          {league && (
            <View style={styles.leagueLeft}>
              <View style={styles.leaguePillPod}>
                <Ionicons name="sparkles" size={12} color={COLORS.purple} />
                <Text style={styles.leaguePillText}>
                  {league.league_name?.toUpperCase()} LEAGUE
                </Text>
              </View>

              <Text style={styles.leagueTitle}>Top 10 advance to finals</Text>

              <View style={styles.timerRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.leagueCountdown}>
                  Ends in {formatCountdown(secondsLeft)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.trophyCircle}>
            <Ionicons name="trophy" size={32} color={COLORS.gold} />
          </View>
        </View>
      </Glass>
    </View>
  );

  /* Leaderboard Row Item */
  const renderLeaderItem = ({ item }: { item: LeaderboardUser }) => {
    const isUser = !!user?.id && item.user_id === user.id;
    const medal = getRankBadge(item.rank);

    return (
      <Glass
        style={[
          styles.rankItemGlass,
          isUser && styles.userRankItemGlass,
        ]}
      >
        <View style={styles.rankRowContent}>
          <View style={styles.rankNumContainer}>
            {medal ? (
              <Text style={styles.medalText}>{medal}</Text>
            ) : (
              <Text style={styles.rankNum}>{item.rank}</Text>
            )}
          </View>

          <View style={styles.avatarCircle}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{getAvatarFallback(item)}</Text>
            )}
          </View>

          <View style={styles.leaderInfo}>
            <Text
              style={[styles.leaderName, isUser && styles.userNameText]}
              numberOfLines={1}
            >
              {getDisplayName(item, isUser)}
            </Text>
          </View>

          <View style={styles.xpPill}>
            <Ionicons name="flash" size={12} color={COLORS.green} />
            <Text style={styles.xpText}>{item.weekly_xp} XP</Text>
          </View>
        </View>
      </Glass>
    );
  };

  /* Footer Component */
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={COLORS.purple} />
          <Text style={styles.loadingMoreText}>Loading more leaders...</Text>
        </View>
      );
    }
    if (!hasMore && leaders.length > 0) {
      return (
        <View style={styles.endOfListContainer}>
          <Text style={styles.endOfListText}>End of Leaderboard</Text>
        </View>
      );
    }
    return null;
  };

  /* Empty Component */
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.emptySubtext}>Loading leaderboard...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No Leaderboard Data</Text>
        <Text style={styles.emptySubtext}>
          Check back later after earning some XP!
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
        {/* ============================================================
            SKIA VISUAL BACKGROUND (REF: LessonStartView / Profile)
        ============================================================ */}
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

        <FlatList
          data={leaders}
          keyExtractor={(item, index) =>
            item.user_id || `rank-${item.rank}-${index}`
          }
          renderItem={renderLeaderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.purple]}
              tintColor={COLORS.purple}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: horizontalPadding },
          ]}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenContainer>
  );
}

/* ========================================================================
   STYLES — SLEEK TRANSLUCENT GLASSMORPHISM (NO ANDROID ELEVATION ARTIFACTS)
   ======================================================================== */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  listContent: {
    paddingTop: 8,
    paddingBottom: 36,
  },

  /* ============================================================
     GLASS COMPONENT STYLES
     ============================================================ */

  glassCard: {
    position: "relative",
    overflow: "hidden",
    marginBottom: 10,
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

  /* ============================================================
     HEADER & LEAGUE BANNER
     ============================================================ */

  headerContainer: {
    marginBottom: 4,
  },

  leagueBannerGlass: {
    padding: 16,
    marginVertical: 12,
  },

  leagueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  leagueLeft: {
    flex: 1,
    paddingRight: 10,
  },

  leaguePillPod: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.20)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 6,
  },

  leaguePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.purple,
    letterSpacing: 0.6,
  },

  leagueTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.4,
  },

  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },

  leagueCountdown: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  trophyCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(247,183,24,0.12)",
    borderWidth: 1.2,
    borderColor: "rgba(247,183,24,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ============================================================
     LEADERBOARD ROWS
     ============================================================ */

  rankItemGlass: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  userRankItemGlass: {
    backgroundColor: "rgba(104,71,245,0.08)",
    borderColor: "rgba(104,71,245,0.30)",
  },

  rankRowContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  rankNumContainer: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  rankNum: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textSecondary,
  },

  medalText: {
    fontSize: 20,
  },

  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },

  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  avatarEmoji: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.purple,
  },

  leaderInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  leaderName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },

  userNameText: {
    color: COLORS.purple,
    fontWeight: "900",
  },

  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22,197,139,0.10)",
    borderWidth: 1,
    borderColor: "rgba(22,197,139,0.25)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 3,
  },

  xpText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.green,
  },

  /* ============================================================
     FOOTER & EMPTY STATES
     ============================================================ */

  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  loadingMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  endOfListContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },

  endOfListText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 12,
  },

  emptySubtext: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
