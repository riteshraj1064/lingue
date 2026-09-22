// app/achievements.tsx

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

/* ============================================================
   TYPES
============================================================ */

export type Achievement = {
  achievement_id: number;
  code: string;
  title: string;
  description: string;
  gem_reward: number;
  xp_reward: number;
  icon_url: string | null;
  progress: number;
  requirement_type: string;
  requirement_value: number;
  unlocked: boolean;
  unlocked_at: string | null;
};

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
      {/* Subtle top edge highlight */}
      <View pointerEvents="none" style={styles.glassTopEdge} />

      {/* Content */}
      <View style={styles.glassContent}>{children}</View>
    </View>
  );
};

/* ============================================================
   HELPER
============================================================ */

export function getAchievementMeta(item: Achievement): {
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  const code = (item.code || "").toUpperCase();
  const req = (item.requirement_type || "").toUpperCase();

  if (code.includes("STREAK") || req.includes("STREAK")) {
    return { iconName: "flame", color: COLORS.orange };
  }
  if (code.includes("XP") || req.includes("XP")) {
    return { iconName: "flash", color: COLORS.gold };
  }
  if (code.includes("LESSON") || req.includes("LESSONS")) {
    return { iconName: "school", color: COLORS.purple };
  }
  if (code.includes("QUESTION") || req.includes("QUESTIONS")) {
    return { iconName: "help-circle", color: COLORS.cyan };
  }
  if (code.includes("GOAL") || req.includes("GOALS")) {
    return { iconName: "trophy", color: COLORS.green };
  }
  return { iconName: "medal", color: COLORS.purple };
}

/* ============================================================
   ACHIEVEMENTS SCREEN COMPONENT
============================================================ */

export default function AchievementsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const isNarrow = width < 360;
  const horizontalPadding = isNarrow ? 10 : 12;

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAchievements() {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_my_achievements");
        if (error) {
          console.error("Failed to load achievements:", error);
        } else if (Array.isArray(data)) {
          setAchievements(data);
        }
      } catch (err) {
        console.error("Error loading achievements:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAchievements();
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalXpRewards = achievements
    .filter((a) => a.unlocked)
    .reduce((acc, curr) => acc + (curr.xp_reward || 0), 0);
  const totalGemRewards = achievements
    .filter((a) => a.unlocked)
    .reduce((acc, curr) => acc + (curr.gem_reward || 0), 0);

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

          <Circle
            cx={width * 0.11}
            cy={height * 0.22}
            r={6}
            color="rgba(112,84,246,0.20)"
          />
          <Circle
            cx={width * 0.91}
            cy={height * 0.35}
            r={9}
            color="rgba(245,181,47,0.19)"
          />
          <Circle
            cx={width * 0.14}
            cy={height * 0.58}
            r={5}
            color="rgba(32,201,138,0.23)"
          />
        </Canvas>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
          ]}
        >
          {/* ==========================================================
              HEADER NAVIGATION
          ========================================================== */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.78}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.purple} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Achievements</Text>

            <View style={styles.headerPlaceholder} />
          </View>

          {/* ==========================================================
              STATS OVERVIEW BANNER (GLASS CARD)
          ========================================================== */}
          <Glass style={styles.statsBannerGlass}>
            <View style={styles.statsBannerRow}>
              {/* Unlocked */}
              <View style={styles.statBannerItem}>
                <View style={[styles.statIconBadge, styles.purplePod]}>
                  <Ionicons name="trophy" size={20} color={COLORS.purple} />
                </View>
                <Text style={styles.statBannerValue}>
                  {unlockedCount}/{achievements.length}
                </Text>
                <Text style={styles.statBannerLabel}>Unlocked</Text>
              </View>

              <View style={styles.bannerDivider} />

              {/* XP Earned */}
              <View style={styles.statBannerItem}>
                <View style={[styles.statIconBadge, styles.orangePod]}>
                  <Ionicons name="flash" size={20} color={COLORS.orange} />
                </View>
                <Text style={styles.statBannerValue}>+{totalXpRewards}</Text>
                <Text style={styles.statBannerLabel}>XP Earned</Text>
              </View>

              <View style={styles.bannerDivider} />

              {/* Gems Earned */}
              <View style={styles.statBannerItem}>
                <View style={[styles.statIconBadge, styles.goldPod]}>
                  <Ionicons name="diamond" size={20} color={COLORS.gold} />
                </View>
                <Text style={styles.statBannerValue}>+{totalGemRewards}</Text>
                <Text style={styles.statBannerLabel}>Gems Earned</Text>
              </View>
            </View>
          </Glass>

          {/* ==========================================================
              ACHIEVEMENTS LIST
          ========================================================== */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.purple} />
              <Text style={styles.loadingText}>Loading achievements...</Text>
            </View>
          ) : achievements.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="ribbon-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No achievements available yet.</Text>
            </View>
          ) : (
            <View style={styles.achievementsList}>
              {achievements.map((item) => {
                const meta = getAchievementMeta(item);
                const progressRatio = Math.min(
                  1,
                  Math.max(
                    0,
                    item.requirement_value > 0
                      ? item.progress / item.requirement_value
                      : 0
                  )
                );

                return (
                  <Glass key={item.achievement_id} style={styles.itemCardGlass}>
                    <View style={styles.cardContentRow}>
                      {/* Icon outer ring */}
                      <View
                        style={[
                          styles.iconContainerOuter,
                          {
                            borderColor: item.unlocked
                              ? meta.color
                              : "rgba(150,143,175,0.25)",
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.iconContainerInner,
                            {
                              backgroundColor: item.unlocked
                                ? `${meta.color}18`
                                : "rgba(104,71,245,0.05)",
                            },
                          ]}
                        >
                          <Ionicons
                            name={meta.iconName}
                            size={24}
                            color={
                              item.unlocked
                                ? meta.color
                                : "rgba(119,115,140,0.50)"
                            }
                          />
                        </View>
                      </View>

                      {/* Main Info */}
                      <View style={styles.infoContainer}>
                        <View style={styles.titleRow}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          <View style={styles.rewardsRow}>
                            {item.xp_reward > 0 && (
                              <View style={styles.rewardPillOrange}>
                                <Ionicons name="flash" size={11} color={COLORS.orange} />
                                <Text style={styles.rewardPillTextOrange}>
                                  +{item.xp_reward} XP
                                </Text>
                              </View>
                            )}
                            {item.gem_reward > 0 && (
                              <View style={styles.rewardPillGold}>
                                <Ionicons name="diamond" size={11} color={COLORS.gold} />
                                <Text style={styles.rewardPillTextGold}>
                                  +{item.gem_reward}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <Text style={styles.itemDescription}>{item.description}</Text>

                        {/* Progress Bar for Locked Items */}
                        {!item.unlocked && item.requirement_value > 0 && (
                          <View style={styles.progressSection}>
                            <View style={styles.progressBarBg}>
                              <View
                                style={[
                                  styles.progressBarFill,
                                  {
                                    width: `${progressRatio * 100}%`,
                                    backgroundColor: meta.color,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.progressText}>
                              {item.progress} / {item.requirement_value}
                            </Text>
                          </View>
                        )}

                        {item.unlocked && item.unlocked_at && (
                          <Text style={styles.unlockedDate}>
                            Unlocked on {new Date(item.unlocked_at).toLocaleDateString()}
                          </Text>
                        )}
                      </View>

                      {/* Status Icon */}
                      <View style={styles.statusContainer}>
                        {item.unlocked ? (
                          <View style={styles.checkBadgeCircle}>
                            <Ionicons name="checkmark" size={12} color={COLORS.white} />
                          </View>
                        ) : (
                          <View style={styles.lockedBadgePod}>
                            <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} />
                          </View>
                        )}
                      </View>
                    </View>
                  </Glass>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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

  scrollContent: {
    paddingTop: 8,
    paddingBottom: 36,
  },

  /* ============================================================
     GLASS COMPONENT STYLES
     ============================================================ */

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

  /* ============================================================
     HEADER NAVIGATION
     ============================================================ */

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(104,71,245,0.06)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.18)",
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.6,
  },

  headerPlaceholder: {
    width: 44,
  },

  /* ============================================================
     STATS BANNER
     ============================================================ */

  statsBannerGlass: {
    padding: 14,
    marginBottom: 14,
  },

  statsBannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  statBannerItem: {
    flex: 1,
    alignItems: "center",
  },

  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
    borderWidth: 1,
  },

  purplePod: {
    backgroundColor: "rgba(104,71,245,0.08)",
    borderColor: "rgba(104,71,245,0.20)",
  },

  orangePod: {
    backgroundColor: "rgba(255,150,0,0.10)",
    borderColor: "rgba(255,150,0,0.25)",
  },

  goldPod: {
    backgroundColor: "rgba(247,183,24,0.10)",
    borderColor: "rgba(247,183,24,0.25)",
  },

  statBannerValue: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },

  statBannerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  bannerDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(104,71,245,0.10)",
  },

  /* ============================================================
     LOADING & EMPTY STATES
     ============================================================ */

  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  /* ============================================================
     ACHIEVEMENTS LIST
     ============================================================ */

  achievementsList: {
    gap: 10,
  },

  itemCardGlass: {
    padding: 14,
  },

  cardContentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  iconContainerOuter: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.3,
    marginRight: 12,
  },

  iconContainerInner: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  infoContainer: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },

  itemTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: COLORS.text,
  },

  rewardsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  rewardPillOrange: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,150,0,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,150,0,0.25)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },

  rewardPillTextOrange: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.orange,
  },

  rewardPillGold: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(247,183,24,0.10)",
    borderWidth: 1,
    borderColor: "rgba(247,183,24,0.25)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },

  rewardPillTextGold: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.gold,
  },

  itemDescription: {
    fontSize: 12.5,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },

  progressBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: "rgba(104,71,245,0.10)",
    borderRadius: 3,
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  progressText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
  },

  unlockedDate: {
    fontSize: 10,
    color: COLORS.green,
    marginTop: 5,
    fontWeight: "700",
  },

  statusContainer: {
    marginLeft: 8,
    paddingTop: 2,
  },

  checkBadgeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },

  lockedBadgePod: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(104,71,245,0.06)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
});
