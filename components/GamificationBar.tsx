import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";

import { useApp } from "../context/AppContext";

export interface GamificationBarProps {
  style?: StyleProp<ViewStyle>;

  onFlagPress?: () => void;
  onNotificationPress?: () => void;

  onStreakPress?: () => void;
  onGemsPress?: () => void;
  onCoinsPress?: () => void;
  onLivesPress?: () => void;

  notificationCount?: number;
}

type StatType = "streak" | "gems" | "coins" | "lives";

interface StatProps {
  type: StatType;
  value: number | string;
  onPress?: () => void;
  width: number;
}

/* ============================================================
   STAT
============================================================ */

const Stat: React.FC<StatProps> = ({
  type,
  value,
  onPress,
  width,
}) => {
  const config = {
    streak: {
      label: "STREAK",
      color: "#E76F18",
      background: "#FFF4E4",
      iconBackground: "#FFE1BF",
      icon: "flame" as const,
    },

    gems: {
      label: "GEMS",
      color: "#1976D2",
      background: "#EFF7FF",
      iconBackground: "#DCEEFF",
      icon: "diamond" as const,
    },

    coins: {
      label: "COINS",
      color: "#A56B00",
      background: "#FFF9DF",
      iconBackground: "#FFE8A0",
      icon: "star" as const,
    },

    lives: {
      label: "LIVES",
      color: "#D92D52",
      background: "#FFF1F4",
      iconBackground: "#FFDCE5",
      icon: "heart" as const,
    },
  }[type];

  const content = (
    <View
      style={[
        styles.stat,
        {
          width,
          backgroundColor: config.background,
          borderColor: `${config.color}30`,
        },
      ]}
    >
      {/* ICON */}

      <View
        style={[
          styles.icon,
          {
            backgroundColor: config.iconBackground,
          },
        ]}
      >
        <Ionicons
          name={config.icon}
          size={16}
          color={config.color}
        />
      </View>

      {/* VALUE */}

      <View style={styles.statContent}>
        <Text
          style={[
            styles.value,
            {
              color: config.color,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
        >
          {value}
        </Text>

        <Text
          style={[
            styles.label,
            {
              color: config.color,
            },
          ]}
          numberOfLines={1}
        >
          {config.label}
        </Text>
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        width,
      }}
    >
      {content}
    </TouchableOpacity>
  );
};

/* ============================================================
   MAIN
============================================================ */

const GamificationBar: React.FC<GamificationBarProps> = ({
  style,

  onFlagPress,
  onNotificationPress,

  onStreakPress,
  onGemsPress,
  onCoinsPress,
  onLivesPress,

  notificationCount = 0,
}) => {
  const { stats, selectedTargetLang } = useApp();


  const { width: screenWidth } = useWindowDimensions();

  /*
   * ==========================================================
   * RESPONSIVE WIDTH CALCULATION
   * ==========================================================
   *
   * Everything is kept inside:
   *
   * screen width
   *
   * Example 390px:
   *
   * 10 padding
   * + 42 course
   * + 4 x stat
   * + 40 notification
   * + spaces
   *
   * = exactly available width
   */

  const horizontalPadding = 10;

  const hudWidth = screenWidth - horizontalPadding * 2;

  const courseWidth =
    screenWidth < 350 ? 40 : screenWidth < 400 ? 43 : 48;

  const notificationWidth =
    screenWidth < 350 ? 38 : screenWidth < 400 ? 40 : 43;

  const gap =
    screenWidth < 350 ? 3 : 4;

  const totalFixedWidth =
    courseWidth +
    notificationWidth +
    gap * 5;

  const availableStatsWidth =
    hudWidth - totalFixedWidth;

  const statWidth =
    availableStatsWidth / 4;

  /*
   * Prevent very small widths from causing negative values.
   */

  const safeStatWidth = Math.max(0, statWidth);

  return (
    <View style={[styles.root, style]}>
      {/* ======================================================
          GAME HUD
      ======================================================= */}

      <View style={styles.hud}>
        {/* ====================================================
            COURSE
        ===================================================== */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onFlagPress}
          style={[
            styles.courseButton,
            {
              width: courseWidth,
              marginRight: gap,
            },
          ]}
        >
          <View
            style={[
              styles.courseMedal,
              {
                width: courseWidth,
                height: courseWidth,
                borderRadius: courseWidth / 2,
              },
            ]}
          >
            <View
              style={[
                styles.courseInner,
                {
                  width: courseWidth - 9,
                  height: courseWidth - 9,
                  borderRadius: (courseWidth - 9) / 2,
                },
              ]}
            >
              <Text
                style={{
                  fontSize:
                    courseWidth < 42 ? 17 : 20,
                }}
              >
                {selectedTargetLang?.flag || "🇺🇸"}
              </Text>
            </View>

            <View style={styles.courseArrow}>
              <Ionicons
                name="chevron-down"
                size={8}
                color="#FFFFFF"
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* ====================================================
            STREAK
        ===================================================== */}

        <View style={{ marginRight: gap }}>
          <Stat
            type="streak"
            value={stats.streak}
            width={safeStatWidth}
            onPress={onStreakPress}
          />
        </View>

        {/* ====================================================
            GEMS
        ===================================================== */}

        <View style={{ marginRight: gap }}>
          <Stat
            type="gems"
            value={stats.gems}
            width={safeStatWidth}
            onPress={onGemsPress}
          />
        </View>

        {/* ====================================================
            COINS
        ===================================================== */}

        <View style={{ marginRight: gap }}>
          <Stat
            type="coins"
            value={stats.coins}
            width={safeStatWidth}
            onPress={onCoinsPress}
          />
        </View>

        {/* ====================================================
            LIVES
        ===================================================== */}

        <View style={{ marginRight: gap }}>
          <Stat
            type="lives"
            value={stats.lives}
            width={safeStatWidth}
            onPress={onLivesPress}
          />
        </View>

        {/* ====================================================
            NOTIFICATION
        ===================================================== */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onNotificationPress}
          style={[
            styles.notificationButton,
            {
              width: notificationWidth,
              height: notificationWidth,
            },
          ]}
        >
          <View
            style={[
              styles.notification,
              {
                width: notificationWidth,
                height: notificationWidth,
                borderRadius: 12,
              },
            ]}
          >
            <Ionicons
              name="notifications"
              size={screenWidth < 350 ? 17 : 19}
              color="#6D4A2C"
            />
          </View>

          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99
                  ? "99+"
                  : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  /* ==========================================================
     ROOT
  ========================================================== */

  root: {
    width: "100%",

    paddingHorizontal: 10,
    paddingVertical: 8,

    backgroundColor: "#BFE8F8",
  },

  /* ==========================================================
     HUD

     IMPORTANT:
     NO flex: 1
     NO wrapping
     NO second row
  ========================================================== */

  hud: {
    width: "100%",

    minHeight: 63,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 5,
    paddingVertical: 6,

    backgroundColor: "#D99542",

    borderRadius: 21,

    borderWidth: 2,
    borderColor: "#B96D28",

    shadowColor: "#704019",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,

    elevation: 6,

    overflow: "hidden",
  },

  /* ==========================================================
     COURSE
  ========================================================== */

  courseButton: {
    height: 48,

    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  courseMedal: {
    backgroundColor: "#F3A41C",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 2.5,
    borderColor: "#FFD86A",

    shadowColor: "#70400E",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,

    elevation: 4,

    position: "relative",
  },

  courseInner: {
    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",
  },

  courseArrow: {
    position: "absolute",

    right: -3,
    bottom: -2,

    width: 16,
    height: 16,

    borderRadius: 8,

    backgroundColor: "#704019",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  /* ==========================================================
     STAT
  ========================================================== */

  stat: {
    height: 49,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 5,

    borderRadius: 13,

    borderWidth: 1,

    shadowColor: "#704019",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.10,
    shadowRadius: 2,

    elevation: 2,

    overflow: "hidden",
  },

  icon: {
    width: 29,
    height: 29,

    borderRadius: 15,

    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,

    marginRight: 4,
  },

  statContent: {
    flex: 1,

    minWidth: 0,

    justifyContent: "center",
  },

  value: {
    fontSize: 15,

    lineHeight: 16,

    fontWeight: "900",

    includeFontPadding: false,
  },

  label: {
    fontSize: 6.5,

    lineHeight: 8,

    fontWeight: "900",

    letterSpacing: 0.35,

    opacity: 0.75,

    includeFontPadding: false,

    marginTop: 1,
  },

  /* ==========================================================
     NOTIFICATION
  ========================================================== */

  notificationButton: {
    flexShrink: 0,

    alignItems: "center",
    justifyContent: "center",

    position: "relative",
  },

  notification: {
    backgroundColor: "#F4E4C7",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1.5,
    borderColor: "#D0AF80",

    shadowColor: "#704019",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,

    elevation: 3,
  },

  /* ==========================================================
     NOTIFICATION BADGE
  ========================================================== */

  badge: {
    position: "absolute",

    right: -2,
    top: -3,

    minWidth: 18,
    height: 18,

    borderRadius: 9,

    paddingHorizontal: 3,

    backgroundColor: "#E53935",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 2,
    borderColor: "#FFFFFF",

    elevation: 4,
  },

  badgeText: {
    color: "#FFFFFF",

    fontSize: 7,

    fontWeight: "900",

    includeFontPadding: false,
  },
});

export default GamificationBar;