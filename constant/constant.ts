// constant/constant.ts
// Lingua — Global High-Fidelity Design System Tokens & Constants

import { useWindowDimensions } from "react-native";

const { width, height } = useWindowDimensions();

/* ============================================================
   COLORS
   ============================================================ */

export const colors = {
  // Brand Primary & Purples
  primary: "#6C4EF5",
  primaryDark: "#5B3BF6",
  primaryLight: "#8A71F8",
  primarySurface: "#F5F2FF",
  primarySurfaceLight: "#FAF8FF",
  splashBackground: "#5E3DEF",
  error: "#FF0000",

  // Gamification & Accent Colors
  success: "#58CC02",
  successDark: "#46A800",
  successLight: "#E5F9D6",
  reward: "#FFC800",
  rewardDark: "#E5B400",
  rewardLight: "#FFF8DD",
  rewardOrange: "#FF9600",
  rewardOrangeLight: "#FFF2E5",
  danger: "#FF4B4B",
  dangerDark: "#E03232",
  dangerLight: "#FFEAEA",
  secondaryBlue: "#4D88FF",
  secondaryBlueDark: "#336EE0",
  secondaryBlueLight: "#F1F6FF",

  // Backgrounds & Surfaces
  background: "#FFFFFF",
  backgroundOffWhite: "#FAFAFA",
  backgroundPurple: "#F5F2FF",
  backgroundBlue: "#F1F6FF",
  backgroundGreen: "#F2FBEF",
  backgroundYellow: "#FFF8DD",
  backgroundDark: "#1E1838",

  // Text Colors
  textPrimary: "#242424",
  textSecondary: "#666666",
  textMuted: "#9E9E9E",
  textWhite: "#FFFFFF",
  textPurple: "#6C4EF5",

  // Borders & Dividers
  border: "#E7E7E7",
  borderLight: "#F0F0F0",
  borderStrong: "#D5D5D5",
  borderSelected: "#6C4EF5",
  inputBackground: "#FAFAFA",
  disabled: "#E5E5E5",
  disabledText: "#A0A0A0",

  // Common
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

/* ============================================================
   TYPOGRAPHY
   ============================================================ */

export const typography = {
  display: {
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "800" as const,
    fontFamily: "Nunito_800ExtraBold",
  },
  hero: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800" as const,
    fontFamily: "Nunito_800ExtraBold",
  },
  h1: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "800" as const,
    fontFamily: "Nunito_800ExtraBold",
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
    fontFamily: "Nunito_700Bold",
  },
  h3: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "700" as const,
    fontFamily: "Nunito_700Bold",
  },
  bodyLarge: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "500" as const,
    fontFamily: "Nunito_600SemiBold",
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400" as const,
    fontFamily: "Nunito_400Regular",
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500" as const,
    fontFamily: "Nunito_600SemiBold",
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700" as const,
    fontFamily: "Nunito_700Bold",
  },
  label: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600" as const,
    fontFamily: "Nunito_600SemiBold",
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600" as const,
    fontFamily: "Nunito_600SemiBold",
  },
  tiny: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600" as const,
    fontFamily: "Nunito_600SemiBold",
  },
} as const;

/* ============================================================
   SPACING & RADIUS
   ============================================================ */

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  section: 56,
  screen: 64,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  input: 12,
  button: 14,
  card: 16,
  largeCard: 20,
  hero: 24,
  pill: 999,
  circle: 999,
} as const;

/* ============================================================
   DIMENSIONS & RESPONSIVE
   ============================================================ */

export const dimensions = {
  buttonHeight: 52,
  buttonHeightLarge: 56,
  inputHeight: 54,
  minimumTouchTarget: 44,
  iconButton: 48,
  headerHeight: 56,
  progressHeight: 8,
  progressHeightLarge: 10,
  languageCardHeight: 62,
  goalCardHeight: 74,
  tabBarHeight: 68,
} as const;

export const screen = {
  width,
  height,
  isSmallPhone: height < 700 || width < 360,
  isStandardPhone: height >= 700 && height < 850,
  isLargePhone: height >= 850,
  isNarrow: width < 360,
  isWide: width >= 430,
} as const;

export const responsive = {
  horizontalPadding: screen.isNarrow ? 16 : 20,
  contentMaxWidth: 560,
  mascotSplashSize: Math.min(width * 0.58, 240),
  mascotAuthSize: Math.min(width * 0.36, 150),
  mascotOnboardingSize: Math.min(width * 0.52, 220),
  mascotCelebrationSize: Math.min(width * 0.5, 210),
} as const;

/* ============================================================
   SHADOWS
   ============================================================ */

export const shadows = {
  subtle: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSelected: {
    shadowColor: "#6C4EF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: "#5B3BF6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

/* ============================================================
   COURSE & LANGUAGE DATA
   ============================================================ */

export interface LanguageOption {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  code: string;
  learners: string;
}

/**
 * Converts a 2-letter ISO 3166-1 alpha-2 country code (e.g. "US", "IN")
 * to a flag emoji (e.g. "🇺🇸", "🇮🇳").
 *
 * If the value already contains a flag emoji (or any non-ASCII character)
 * it is returned as-is, so this is safe to call on DB values that may
 * already be stored as emoji.
 */
export function codeToFlag(value: string | null | undefined): string {
  if (!value) return "🌐";
  // Already an emoji / non-ASCII — pass through
  if (/[^\u0000-\u007F]/.test(value)) return value;
  const upper = value.trim().toUpperCase();
  if (upper.length !== 2) return "🌐";
  // Regional indicator symbols: A=0x1F1E6 … Z=0x1F1FF
  return String.fromCodePoint(
    0x1f1e6 + upper.charCodeAt(0) - 65,
    0x1f1e6 + upper.charCodeAt(1) - 65
  );
}

export interface DailyGoalOption {
  id: "casual" | "regular" | "serious" | "intense";
  title: string;
  duration: string;
  minutes: number;
  iconName: string;
  badgeColor: string;
  badgeBg: string;
}

export const DAILY_GOALS: DailyGoalOption[] = [
  {
    id: "casual",
    title: "Casual",
    duration: "5 min / day",
    minutes: 5,
    iconName: "trophy-outline",
    badgeColor: "#FFC800",
    badgeBg: "#FFF8DD",
  },
  {
    id: "regular",
    title: "Regular",
    duration: "10 min / day",
    minutes: 10,
    iconName: "trophy",
    badgeColor: "#58CC02",
    badgeBg: "#F2FBEF",
  },
  {
    id: "serious",
    title: "Serious",
    duration: "15 min / day",
    minutes: 15,
    iconName: "flame",
    badgeColor: "#FF9600",
    badgeBg: "#FFF2E5",
  },
  {
    id: "intense",
    title: "Intense",
    duration: "20 min / day",
    minutes: 20,
    iconName: "rocket",
    badgeColor: "#6C4EF5",
    badgeBg: "#F5F2FF",
  },
];

export const STORAGE_KEYS = {
  SELECTED_COURSE: "selected_course",
  AUTH_SESSION: "auth_session",
  USER_PROFILE: "user_profile",
  DAILY_GOAL: "daily_goal",
  ONBOARDING_COMPLETED: "onboarding_completed",
  SUBSCRIPTION_ENTITLEMENT: "subscription_entitlement",
} as const;

export default {
  colors,
  typography,
  spacing,
  radius,
  dimensions,
  screen,
  responsive,
  shadows,
  DAILY_GOALS,
  STORAGE_KEYS,
};