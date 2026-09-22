// components/PrimaryButton.tsx

import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import {
  dimensions,
  radius,
  typography,
} from "../constant/constant";

/* ============================================================
   TYPES
============================================================ */

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;

  disabled?: boolean;
  loading?: boolean;

  variant?:
  | "primary"
  | "success"
  | "danger"
  | "reward";

  size?: "regular" | "large";

  icon?: React.ReactNode;

  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;

  testID?: string;
}

/* ============================================================
   COLORS
============================================================ */

const COLORS = {
  primary: "#6847F5",
  primaryDark: "#5135D4",

  success: "#13B980",
  successDark: "#078B63",

  danger: "#E9576D",
  dangerDark: "#C83E54",

  reward: "#D99A00",
  rewardDark: "#B87900",

  text: "#151329",

  white: "#FFFFFF",
};

/* ============================================================
   COMPONENT
============================================================ */

export const PrimaryButton: React.FC<
  PrimaryButtonProps
> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "regular",
  icon,
  style,
  textStyle,
  testID,
}) => {
    const scaleAnim = useRef(
      new Animated.Value(1)
    ).current;

    /* ==========================================================
       PRESS ANIMATION
    ========================================================== */

    const handlePressIn = () => {
      if (disabled || loading) {
        return;
      }

      Animated.spring(scaleAnim, {
        toValue: 0.975,
        useNativeDriver: true,
        speed: 40,
        bounciness: 3,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 5,
      }).start();
    };

    /* ==========================================================
       VARIANT COLORS
  
       IMPORTANT:
       These are intentionally VERY subtle.
       They are not used as a solid button background.
    ========================================================== */

    const getAccentColor = () => {
      if (disabled) {
        return "rgba(90,86,105,0.42)";
      }

      switch (variant) {
        case "success":
          return COLORS.success;

        case "danger":
          return COLORS.danger;

        case "reward":
          return COLORS.reward;

        case "primary":
        default:
          return COLORS.primary;
      }
    };

    const getDarkAccentColor = () => {
      if (disabled) {
        return "rgba(75,71,90,0.48)";
      }

      switch (variant) {
        case "success":
          return COLORS.successDark;

        case "danger":
          return COLORS.dangerDark;

        case "reward":
          return COLORS.rewardDark;

        case "primary":
        default:
          return COLORS.primaryDark;
      }
    };

    /*
     * Extremely subtle tint.
     *
     * Notice:
     *
     * primary = NOT purple rectangle
     *
     * It is only 5%.
     */
    const getGlassTint = () => {
      if (disabled) {
        return "rgba(210,207,220,0.14)";
      }

      switch (variant) {
        case "success":
          return "rgba(32,201,138,0.055)";

        case "danger":
          return "rgba(239,90,110,0.055)";

        case "reward":
          return "rgba(245,181,47,0.065)";

        case "primary":
        default:
          return "rgba(112,84,246,0.045)";
      }
    };

    /*
     * Small accent highlight.
     *
     * This is inset and NOT full purple.
     */
    const getAccentHighlight = () => {
      if (disabled) {
        return "rgba(255,255,255,0.05)";
      }

      switch (variant) {
        case "success":
          return "rgba(32,201,138,0.075)";

        case "danger":
          return "rgba(239,90,110,0.065)";

        case "reward":
          return "rgba(245,181,47,0.075)";

        case "primary":
        default:
          return "rgba(112,84,246,0.065)";
      }
    };

    /*
     * Border is mostly white.
     *
     * This makes it look like glass instead of a colored
     * button.
     */
    const getBorderColor = () => {
      if (disabled) {
        return "rgba(255,255,255,0.48)";
      }

      switch (variant) {
        case "success":
          return "rgba(180,255,230,0.78)";

        case "danger":
          return "rgba(255,190,200,0.76)";

        case "reward":
          return "rgba(255,235,165,0.80)";

        case "primary":
        default:
          return "rgba(255,255,255,0.88)";
      }
    };

    /* ==========================================================
       SIZE
    ========================================================== */

    const height =
      size === "large"
        ? dimensions.buttonHeightLarge
        : dimensions.buttonHeight;

    const buttonRadius =
      size === "large"
        ? Math.max(radius.button, 28)
        : radius.button;

    /* ==========================================================
       RENDER
    ========================================================== */

    return (
      <Animated.View
        style={[
          styles.wrapper,
          {
            height,
            transform: [
              {
                scale: scaleAnim,
              },
            ],
          },
          style,
        ]}
      >
        <TouchableOpacity
          testID={testID}
          activeOpacity={0.78}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          style={[
            styles.touchable,
            {
              borderRadius: buttonRadius,
            },
          ]}
        >
          <View
            style={[
              styles.button,
              {
                borderRadius: buttonRadius,
              },
            ]}
          >
            {/* ==================================================
              GLASS BASE

              Very light neutral glass.

              This is NOT a purple background.
          ================================================== */}

            <View
              pointerEvents="none"
              style={[
                styles.glass,
                {
                  borderRadius: buttonRadius,
                  backgroundColor:
                    getGlassTint(),
                },
              ]}
            />

            {/* ==================================================
              SOFT ACCENT HIGHLIGHT

              Small inset accent only.
          ================================================== */}

            <View
              pointerEvents="none"
              style={[
                styles.accentHighlight,
                {
                  borderRadius:
                    Math.max(
                      0,
                      buttonRadius - 5
                    ),
                  backgroundColor:
                    getAccentHighlight(),
                },
              ]}
            />

            {/* ==================================================
              TOP GLASS REFLECTION
          ================================================== */}

            <View
              pointerEvents="none"
              style={[
                styles.topReflection,
                {
                  borderTopLeftRadius:
                    buttonRadius,
                  borderTopRightRadius:
                    buttonRadius,
                },
              ]}
            />

            {/* ==================================================
              OUTER BORDER
          ================================================== */}

            <View
              pointerEvents="none"
              style={[
                styles.outerBorder,
                {
                  borderRadius:
                    buttonRadius,
                  borderColor:
                    getBorderColor(),
                },
              ]}
            />

            {/* ==================================================
              INNER BORDER
          ================================================== */}

            <View
              pointerEvents="none"
              style={[
                styles.innerBorder,
                {
                  borderRadius:
                    Math.max(
                      0,
                      buttonRadius - 4
                    ),
                },
              ]}
            />

            {/* ==================================================
              CONTENT
          ================================================== */}

            <View style={styles.content}>
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={getAccentColor()}
                />
              ) : (
                <>
                  {/* Icon */}

                  {icon ? (
                    <View
                      style={styles.iconContainer}
                    >
                      {icon}
                    </View>
                  ) : null}

                  {/* Text */}

                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[
                      styles.text,
                      {
                        color:
                          getDarkAccentColor(),
                      },
                      disabled &&
                      styles.disabledText,
                      textStyle,
                    ]}
                  >
                    {title}
                  </Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  /* ==========================================================
     WRAPPER
  ========================================================== */

  wrapper: {
    width: "100%",
  },

  /* ==========================================================
     TOUCHABLE

     IMPORTANT:
     No backgroundColor.
     No elevation.
     No shadow.
  ========================================================== */

  touchable: {
    width: "100%",

    height: "100%",

    overflow: "hidden",

    backgroundColor: "transparent",

    elevation: 0,
  },

  /* ==========================================================
     BUTTON
  ========================================================== */

  button: {
    flex: 1,

    width: "100%",

    height: "100%",

    overflow: "hidden",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(239,236,249,0.20)",

    elevation: 0,

    shadowOpacity: 0,
  },

  /* ==========================================================
     MAIN GLASS

     Neutral translucent surface.

     NO strong purple.
  ========================================================== */

  glass: {
    position: "absolute",

    top: 0,

    left: 0,

    right: 0,

    bottom: 0,
  },

  /* ==========================================================
     ACCENT HIGHLIGHT

     Inset and extremely subtle.
  ========================================================== */

  accentHighlight: {
    position: "absolute",

    top: 4,

    left: 4,

    right: 4,

    bottom: 4,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.10)",
  },

  /* ==========================================================
     TOP REFLECTION
  ========================================================== */

  topReflection: {
    position: "absolute",

    top: 1,

    left: 2,

    right: 2,

    height: "34%",

    backgroundColor:
      "rgba(255,255,255,0.12)",
  },

  /* ==========================================================
     OUTER GLASS BORDER
  ========================================================== */

  outerBorder: {
    position: "absolute",

    top: 0,

    left: 0,

    right: 0,

    bottom: 0,

    borderWidth: 1.4,

    backgroundColor: "transparent",
  },

  /* ==========================================================
     INNER GLASS BORDER
  ========================================================== */

  innerBorder: {
    position: "absolute",

    top: 4,

    left: 4,

    right: 4,

    bottom: 4,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.20)",

    backgroundColor: "transparent",
  },

  /* ==========================================================
     CONTENT
  ========================================================== */

  content: {
    position: "relative",

    zIndex: 20,

    width: "100%",

    height: "100%",

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",

    paddingHorizontal: 20,
  },

  /* ==========================================================
     TEXT
  ========================================================== */

  text: {
    ...typography.button,

    textAlign: "center",

    fontWeight: "900",

    letterSpacing: -0.2,

    /*
     * NO white text shadow.
     *
     * Dark colored text is much cleaner
     * on the new light glass UI.
     */
    textShadowColor: "transparent",

    textShadowOffset: {
      width: 0,

      height: 0,
    },

    textShadowRadius: 0,
  },

  disabledText: {
    color:
      "rgba(80,76,95,0.42)",
  },

  /* ==========================================================
     ICON
  ========================================================== */

  iconContainer: {
    marginRight: 8,

    alignItems: "center",

    justifyContent: "center",
  },
});

export default PrimaryButton;