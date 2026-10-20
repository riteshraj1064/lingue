// app/(tabs)/profile.tsx

import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import { useRouter, type Href } from "expo-router";
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

import { Mascot } from "../../components/Mascot";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useApp } from "../../context/AppContext";

/* ============================================================
   TYPES
============================================================ */

type Achievement = {
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
   COLOR PALETTE (REF: LessonStartView)
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

function getAchievementMeta(item: Achievement): {
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  const code = (item.code || "").toUpperCase();
  const req = (item.requirement_type || "").toUpperCase();

  if (code.includes("STREAK") || req.includes("STREAK")) {
    return {
      iconName: "flame",
      color: COLORS.orange,
    };
  }

  if (code.includes("XP") || req.includes("XP")) {
    return {
      iconName: "flash",
      color: COLORS.gold,
    };
  }

  if (
    code.includes("LESSON") ||
    code.includes("LESSONS") ||
    req.includes("LESSON")
  ) {
    return {
      iconName: "school",
      color: COLORS.purple,
    };
  }

  if (
    code.includes("QUESTION") ||
    code.includes("QUESTIONS") ||
    req.includes("QUESTION")
  ) {
    return {
      iconName: "help-circle",
      color: COLORS.cyan,
    };
  }

  if (code.includes("GOAL") || req.includes("GOAL")) {
    return {
      iconName: "trophy",
      color: COLORS.green,
    };
  }

  return {
    iconName: "medal",
    color: COLORS.purple,
  };
}

/* ============================================================
   PROFILE SCREEN COMPONENT
============================================================ */

export default function ProfileScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  /* ==========================================================
     AUTOMATIC RESPONSIVE DIMENSIONS
  ========================================================== */

  const isVerySmallHeight = height < 700;
  const isSmallHeight = height < 760;
  const isNarrow = width < 360;

  const horizontalPadding = isNarrow ? 10 : 12;

  const mascotSize = isVerySmallHeight ? 80 : isSmallHeight ? 90 : 100;
  const mascotCircleSize = mascotSize + 34;

  /* ==========================================================
     APP STATE & HANDLERS (LOGIC 100% PRESERVED)
  ========================================================== */

  const {
    user,
    selectedTargetLang,
    selectedNativeLang,
    stats,
    logout,
  } = useApp();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] =
    useState<boolean>(true);
  const [league, setLeague] = useState<any>(null);



  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const openPolicy = (
    document: "terms" | "privacy" | "subscription" | "deleteAccount"
  ) => {
    router.push({
      pathname: "/policy",
      params: { document },
    } as unknown as Href);
  };


  useEffect(() => {
    async function fetchAchievements() {
      try {
        setLoadingAchievements(true);

        const { data, error } = await supabase.rpc("get_my_achievements");

        if (error) {
          console.error("Failed to fetch achievements:", error);
        } else if (Array.isArray(data)) {
          setAchievements(data);
        }
      } catch (err) {
        console.error("Error fetching achievements:", err);
      } finally {
        setLoadingAchievements(false);
      }
    }


    const loadLeague = async () => {
      const { data, error } = await supabase.rpc('get_my_league_status');

      if (error) {
        console.error(error);
      } else {
        setLeague(data);
      }
    }
    loadLeague()
    fetchAchievements();
  }, [user]);

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
            SKIA VISUAL BACKGROUND (REF: LessonStartView)
        ============================================================ */}
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Base gradient */}
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width, height)}
              colors={["#F5F2FF", "#F0EDFF", "#F8F8FF", "#EEF9F7"]}
            />
          </Rect>

          {/* Top-right lavender glow */}
          <Circle
            cx={width * 0.88}
            cy={height * 0.13}
            r={width * 0.57}
            color="rgba(111,82,245,0.14)"
          />

          {/* Left blue glow */}
          <Circle
            cx={-width * 0.05}
            cy={height * 0.78}
            r={width * 0.55}
            color="rgba(61,205,226,0.13)"
          />

          {/* Bottom lavender glow */}
          <Circle
            cx={width * 0.8}
            cy={height * 0.94}
            r={width * 0.46}
            color="rgba(112,87,245,0.10)"
          />

          {/* Decorative ambient dots */}
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
          <Circle
            cx={width * 0.86}
            cy={height * 0.53}
            r={6}
            color="rgba(112,84,246,0.14)"
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
              HEADER
          ========================================================== */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitleText}>Profile</Text>
              <Text style={styles.headerSubtitleText}>Your learning journey</Text>
            </View>

            <TouchableOpacity activeOpacity={0.78} style={styles.headerCircleBtn}>
              <Ionicons name="settings-outline" size={22} color={COLORS.purple} />
            </TouchableOpacity>
          </View>

          {/* ==========================================================
              PROFILE GLASS CARD
          ========================================================== */}
          <Glass style={styles.profileGlassCard}>
            <View style={styles.profileInner}>
              {/* MASCOT HERO */}
              <View style={styles.mascotArea}>
                <View
                  style={[
                    styles.mascotGlow,
                    {
                      width: mascotCircleSize + 16,
                      height: mascotCircleSize + 16,
                      borderRadius: (mascotCircleSize + 16) / 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.mascotCircle,
                    {
                      width: mascotCircleSize,
                      height: mascotCircleSize,
                      borderRadius: mascotCircleSize / 2,
                    },
                  ]}
                />
                <Mascot size={mascotSize} pose="happy" floating={false} />
              </View>

              {/* USER DETAILS */}
              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <View style={styles.nameArea}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      style={[
                        styles.userName,
                        { fontSize: isNarrow ? 22 : 25 },
                      ]}
                    >
                      {user?.user_metadata?.full_name ||
                        user?.email?.split("@")[0] ||
                        "Learner"}
                    </Text>

                    <Text numberOfLines={1} style={styles.userHandle}>
                      @{user?.email?.split("@")[0] || "lingua_master"}
                    </Text>
                  </View>

                  <TouchableOpacity activeOpacity={0.8} style={styles.editGlassBtn}>
                    <Ionicons name="create-outline" size={15} color={COLORS.purple} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Joined date */}
                <View style={styles.joinRow}>
                  <View style={styles.calendarCircle}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={COLORS.purple}
                    />
                  </View>
                  <Text numberOfLines={1} style={styles.joinText}>
                    Joined September 2026
                  </Text>
                </View>

                {/* Language glass bar */}
                <View style={styles.languageGlassBar}>
                  <View style={styles.languageItem}>
                    <Text style={styles.flagText}>{selectedNativeLang.flag}</Text>
                    <Text numberOfLines={1} style={styles.languageNameText}>
                      {selectedNativeLang.name}
                    </Text>
                  </View>

                  <View style={styles.languageArrowCircle}>
                    <Ionicons
                      name="arrow-forward"
                      size={15}
                      color={COLORS.white}
                    />
                  </View>

                  <View style={styles.languageItem}>
                    <Text style={styles.flagText}>{selectedTargetLang.flag}</Text>
                    <Text numberOfLines={1} style={styles.languageNameText}>
                      {selectedTargetLang.name}
                    </Text>
                  </View>
                </View>

                <Text style={styles.learningQuote}>
                  Learning a better you, one word at a time{" "}
                  <Text style={styles.heartText}>♥</Text>
                </Text>
              </View>
            </View>
          </Glass>

          {/* ==========================================================
              STATISTICS GLASS CARD
          ========================================================== */}
          <Glass style={styles.sectionGlassCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeading}>
                <View style={[styles.headingIconPod, styles.purplePod]}>
                  <Ionicons name="stats-chart" size={18} color={COLORS.purple} />
                </View>
                <Text style={styles.sectionTitle}>Statistics</Text>
              </View>
              <Text style={styles.sectionHint}>Keep going ✨</Text>
            </View>

            <View style={styles.statsGrid}>
              {/* Day Streak */}
              <View style={styles.statBox}>
                <View style={[styles.statIconPod, styles.orangePod]}>
                  <Ionicons name="flame" size={23} color={COLORS.orange} />
                </View>
                <View style={styles.statTextContainer}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    style={styles.statValueText}
                  >
                    {stats.streak}
                  </Text>
                  <Text numberOfLines={1} style={styles.statLabelText}>
                    Day streak
                  </Text>
                </View>
              </View>

              {/* Total XP */}
              <View style={styles.statBox}>
                <View style={[styles.statIconPod, styles.goldPod]}>
                  <Ionicons name="flash" size={23} color={COLORS.gold} />
                </View>
                <View style={styles.statTextContainer}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    style={styles.statValueText}
                  >
                    {stats.xp}
                  </Text>
                  <Text numberOfLines={1} style={styles.statLabelText}>
                    Total XP
                  </Text>
                </View>
              </View>

              {/* League */}
              <View style={styles.statBox}>
                <View style={[styles.statIconPod, styles.purplePod]}>
                  <Ionicons name="shield-checkmark" size={23} color={COLORS.purple} />
                </View>
                <View style={styles.statTextContainer}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    style={styles.statValueText}
                  >
                    {league ? league.league_name : "Bronze"}
                  </Text>
                  <Text numberOfLines={1} style={styles.statLabelText}>
                    Current league
                  </Text>
                </View>
              </View>

              {/* Top 3 */}
              <View style={styles.statBox}>
                <View style={[styles.statIconPod, styles.greenPod]}>
                  <Ionicons name="diamond" size={23} color={COLORS.green} />
                </View>
                <View style={styles.statTextContainer}>
                  <Text numberOfLines={1} style={styles.statValueText}>
                    {stats.gems}
                  </Text>
                  <Text numberOfLines={1} style={styles.statLabelText}>
                    Gems
                  </Text>
                </View>
              </View>
            </View>
          </Glass>

          {/* ==========================================================
              ACHIEVEMENTS GLASS CARD
          ========================================================== */}
          <Glass style={styles.sectionGlassCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeading}>
                <View style={[styles.headingIconPod, styles.goldPod]}>
                  <Ionicons name="trophy" size={18} color={COLORS.gold} />
                </View>
                <Text style={styles.sectionTitle}>Achievements</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/achievements")}
                style={styles.viewAllBtn}
              >
                <Text style={styles.viewAllBtnText}>View All</Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={COLORS.purple}
                />
              </TouchableOpacity>
            </View>

            {loadingAchievements ? (
              <ActivityIndicator
                size="small"
                color={COLORS.purple}
                style={{ marginVertical: 20 }}
              />
            ) : (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.achievementScrollRow}
              >
                {achievements.slice(0, 5).map((item) => {
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
                    <View
                      key={item.achievement_id}
                      style={[
                        styles.achievementCard,
                        { width: isNarrow ? 104 : 114 },
                      ]}
                    >
                      <View
                        style={[
                          styles.achievementIconOuter,
                          {
                            borderColor: item.unlocked
                              ? meta.color
                              : "rgba(150,143,175,0.25)",
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.achievementIconInner,
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

                      <Text numberOfLines={2} style={styles.achievementTitleText}>
                        {item.title}
                      </Text>

                      {item.unlocked ? (
                        <View style={styles.unlockedBadgeRow}>
                          <View style={styles.checkIconCircle}>
                            <Ionicons
                              name="checkmark"
                              size={9}
                              color={COLORS.white}
                            />
                          </View>
                          <Text style={styles.unlockedBadgeText}>Unlocked</Text>
                        </View>
                      ) : item.requirement_value > 0 ? (
                        <>
                          <Text style={styles.progressValueText}>
                            {item.progress}/{item.requirement_value}
                          </Text>
                          <View style={styles.progressTrackBar}>
                            <View
                              style={[
                                styles.progressFillBar,
                                {
                                  width: `${progressRatio * 100}%`,
                                  backgroundColor: meta.color,
                                },
                              ]}
                            />
                          </View>
                        </>
                      ) : (
                        <View style={styles.lockedBadgeRow}>
                          <Ionicons
                            name="lock-closed"
                            size={11}
                            color={COLORS.textMuted}
                          />
                          <Text style={styles.lockedBadgeText}>Locked</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Glass>

          {/* ==========================================================
              ACTIONS GLASS LIST CARD
          ========================================================== */}
          <Glass style={styles.actionsGlassCard}>
            {/* Account */}
            <TouchableOpacity activeOpacity={0.75} style={styles.actionRowBtn}>
              <View style={[styles.actionIconPod, styles.purplePod]}>
                <Ionicons name="person-outline" size={18} color={COLORS.purple} />
              </View>
              <Text style={styles.actionRowText}>Account</Text>
              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* Switch course */}
            {/* <TouchableOpacity
              activeOpacity={0.75}
              style={styles.actionRowBtn}
              onPress={() => router.push("/(onboarding)/courses")}
            >
              <View style={[styles.actionIconPod, styles.cyanPod]}>
                <Ionicons name="language" size={18} color={COLORS.cyan} />
              </View>
              <Text style={styles.actionRowText}>Switch Course</Text>
              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.actionDivider} /> */}
            <TouchableOpacity activeOpacity={0.75}
              onPress={() => router.push("/plans")}
              style={styles.actionRowBtn}>
              <View style={[styles.actionIconPod, styles.purplePod]}>
                <Ionicons name="settings-outline" size={18} color={COLORS.purple} />
              </View>
              <Text style={styles.actionRowText}>Plans</Text>
              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            {/* App Settings */}
            <TouchableOpacity activeOpacity={0.75} style={styles.actionRowBtn}>
              <View style={[styles.actionIconPod, styles.purplePod]}>
                <Ionicons name="settings-outline" size={18} color={COLORS.purple} />
              </View>
              <Text style={styles.actionRowText}>App Settings</Text>
              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={() => openPolicy("terms")}
              style={styles.actionRowBtn}
            >
              <View style={[styles.actionIconPod, styles.purplePod]}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.purple} />
              </View>
              <Text style={styles.actionRowText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={17} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={() => openPolicy("privacy")}
              style={styles.actionRowBtn}
            >
              <View style={[styles.actionIconPod, styles.cyanPod]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.cyan} />
              </View>
              <Text style={styles.actionRowText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={17} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={() => openPolicy("subscription")}
              style={styles.actionRowBtn}
            >
              <View style={[styles.actionIconPod, styles.goldPod]}>
                <Ionicons name="card-outline" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.actionRowText}>Subscription Policy</Text>
              <Ionicons name="chevron-forward" size={17} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={() => openPolicy("deleteAccount")}
              style={styles.actionRowBtn}
            >
              <View style={[styles.actionIconPod, styles.dangerPod]}>
                <Ionicons name="person-remove-outline" size={18} color={COLORS.danger} />
              </View>
              <Text style={[styles.actionRowText, styles.logoutText]}>
                Delete Account
              </Text>
              <Ionicons name="chevron-forward" size={17} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* Reset */}
            {/* <TouchableOpacity
              activeOpacity={0.75}
              style={styles.actionRowBtn}
              onPress={handleReset}
            >
              <View style={[styles.actionIconPod, styles.orangePod]}>
                <Ionicons name="refresh-outline" size={18} color={COLORS.orange} />
              </View>
              <Text style={[styles.actionRowText, styles.resetText]}>
                Reset Progress
              </Text>
              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.actionDivider} /> */}

            {/* Logout */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.actionRowBtn}
              onPress={handleLogout}
            >
              <View style={[styles.actionIconPod, styles.dangerPod]}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
              </View>
              <Text style={[styles.actionRowText, styles.logoutText]}>
                Log Out
              </Text>
              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </Glass>

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
    paddingBottom: 80,
  },

  /* ============================================================
     GLASS COMPONENT STYLES (NO ELEVATION TO PREVENT WHITE RECTANGLES)
     ============================================================ */

  glassCard: {
    position: "relative",
    overflow: "hidden",
    marginBottom: 14,
    borderRadius: 24,
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
     HEADER
     ============================================================ */

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

  headerCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    backgroundColor: "rgba(104,71,245,0.06)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.18)",
  },

  /* ============================================================
     PROFILE CARD INNER
     ============================================================ */

  profileGlassCard: {
    padding: 16,
  },

  profileInner: {
    width: "100%",
    alignItems: "center",
  },

  mascotArea: {
    width: "100%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  mascotGlow: {
    position: "absolute",
    backgroundColor: "rgba(111,82,245,0.08)",
  },

  mascotCircle: {
    position: "absolute",
    backgroundColor: "rgba(104,71,245,0.05)",
    borderWidth: 1.2,
    borderColor: "rgba(104,71,245,0.18)",
  },

  profileDetails: {
    width: "100%",
    minWidth: 0,
  },

  nameRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },

  nameArea: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  userName: {
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
  },

  userHandle: {
    marginTop: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  editGlassBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(104,71,245,0.07)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.20)",
  },

  editBtnText: {
    marginLeft: 4,
    fontSize: 12.5,
    fontWeight: "800",
    color: COLORS.purple,
  },

  joinRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },

  calendarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.18)",
  },

  joinText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  languageGlassBar: {
    width: "100%",
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "rgba(104,71,245,0.05)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
  },

  languageItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  flagText: {
    fontSize: 19,
    marginRight: 6,
  },

  languageNameText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: COLORS.text,
  },

  languageArrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    backgroundColor: COLORS.purple,
  },

  learningQuote: {
    marginTop: 10,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  heartText: {
    color: COLORS.danger,
    fontSize: 15,
  },

  /* ============================================================
     SECTION GLASS CARDS
     ============================================================ */

  sectionGlassCard: {
    padding: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  headingIconPod: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
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

  orangePod: {
    backgroundColor: "rgba(255,150,0,0.10)",
    borderColor: "rgba(255,150,0,0.25)",
  },

  greenPod: {
    backgroundColor: "rgba(22,197,139,0.10)",
    borderColor: "rgba(22,197,139,0.25)",
  },

  cyanPod: {
    backgroundColor: "rgba(61,205,226,0.10)",
    borderColor: "rgba(61,205,226,0.25)",
  },

  dangerPod: {
    backgroundColor: "rgba(255,75,75,0.10)",
    borderColor: "rgba(255,75,75,0.25)",
  },

  sectionTitle: {
    fontSize: 19.5,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.4,
  },

  sectionHint: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
  },

  viewAllBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: COLORS.purple,
    marginRight: 2,
  },

  /* ============================================================
     STATISTICS GRID
     ============================================================ */

  statsGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 9,
  },

  statBox: {
    width: "48.5%",
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "rgba(104,71,245,0.04)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.14)",
  },

  statIconPod: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 1,
  },

  statTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  statValueText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    color: COLORS.text,
  },

  statLabelText: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  /* ============================================================
     ACHIEVEMENTS
     ============================================================ */

  achievementScrollRow: {
    gap: 9,
    paddingHorizontal: 1,
  },

  achievementCard: {
    minHeight: 148,
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 9,
    borderRadius: 18,
    backgroundColor: "rgba(104,71,245,0.04)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.14)",
  },

  achievementIconOuter: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.3,
  },

  achievementIconInner: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  achievementTitleText: {
    width: "100%",
    minHeight: 30,
    marginTop: 7,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  unlockedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  checkIconCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    backgroundColor: COLORS.green,
  },

  unlockedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.green,
  },

  progressValueText: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  progressTrackBar: {
    width: 58,
    height: 4,
    overflow: "hidden",
    marginTop: 4,
    borderRadius: 2,
    backgroundColor: "rgba(104,71,245,0.10)",
  },

  progressFillBar: {
    height: "100%",
    borderRadius: 2,
  },

  lockedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  lockedBadgeText: {
    marginLeft: 3,
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
  },

  /* ============================================================
     ACTIONS LIST CARD
     ============================================================ */

  actionsGlassCard: {
    paddingHorizontal: 2,
  },

  actionRowBtn: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  actionIconPod: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    borderWidth: 1,
  },

  actionRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  resetText: {
    color: COLORS.orange,
  },

  logoutText: {
    color: COLORS.danger,
  },

  actionDivider: {
    height: 1,
    marginHorizontal: 12,
    backgroundColor: "rgba(104,71,245,0.08)",
  },
});