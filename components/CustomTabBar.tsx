import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BlurView } from "expo-blur";

import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  Canvas,
  LinearGradient,
  Rect,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "../constant/constant";

/* =========================================================
   CONFIG
========================================================= */

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 180,
  mass: 0.65,
};

/* =========================================================
   CONSTANTS
========================================================= */

const BAR_HEIGHT = 70;
const BAR_RADIUS = 35;

const ACTIVE_WIDTH = 64;
const ACTIVE_HEIGHT = 48;
const ACTIVE_RADIUS = 24;

/* =========================================================
   ANIMATED ACTIVE GLASS
========================================================= */

const ActiveGlass = ({
  progress,
}: {
  progress: Animated.SharedValue<number>;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0.7, 1]),

      transform: [
        {
          scale: interpolate(progress.value, [0, 1], [0.65, 1]),
        },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.activeGlass, animatedStyle]}
    >
      {/* -------------------------------------------
          BACKGROUND BLUR
      -------------------------------------------- */}

      <BlurView
        intensity={45}
        tint="light"
        style={StyleSheet.absoluteFill}
      />

      {/* -------------------------------------------
          SKIA GLASS
      -------------------------------------------- */}

      <Canvas
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        {/* Main transparent glass */}
        <RoundedRect
          x={0}
          y={0}
          width={ACTIVE_WIDTH}
          height={ACTIVE_HEIGHT}
          r={ACTIVE_RADIUS}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, ACTIVE_HEIGHT)}
            colors={[
              "rgba(255,255,255,0.38)",
              "rgba(255,255,255,0.12)",
            ]}
          />
        </RoundedRect>

        {/* Top reflection */}
        <Rect
          x={10}
          y={1}
          width={ACTIVE_WIDTH - 20}
          height={1}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(ACTIVE_WIDTH, 0)}
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.8)",
              "rgba(255,255,255,0)",
            ]}
          />
        </Rect>
      </Canvas>

      {/* Glass edge */}
      <View
        pointerEvents="none"
        style={styles.activeGlassBorder}
      />
    </Animated.View>
  );
};

/* =========================================================
   TAB ITEM
========================================================= */

const TabBarItem = ({
  isFocused,
  options,
  onPress,
  onLongPress,
}: {
  isFocused: boolean;
  options: any;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(
      isFocused ? 1 : 0,
      SPRING_CONFIG
    );
  }, [isFocused]);

  /* =====================================================
     ICON ANIMATION
  ===================================================== */

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(
            progress.value,
            [0, 1],
            [1, 1.12]
          ),
        },

        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [1, -2]
          ),
        },
      ],
    };
  });

  /* =====================================================
     LABEL ANIMATION
  ===================================================== */

  const labelAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        progress.value,
        [0, 0.4, 1],
        [0, 0, 1]
      ),

      transform: [
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [5, 0]
          ),
        },
      ],
    };
  });

  /* =====================================================
     ICON COLOR
  ===================================================== */

  const iconColor = isFocused
    ? colors.primary
    : "rgba(35,40,50,0.55)";

  /* =====================================================
     LABEL
  ===================================================== */

  const label =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
        ? options.title
        : "";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={
        isFocused
          ? { selected: true }
          : {}
      }
      accessibilityLabel={
        options.tabBarAccessibilityLabel
      }
      testID={options.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      style={styles.tabItem}
    >
      {/* =================================================
          ACTIVE GLASS
      ================================================= */}

      <ActiveGlass progress={progress} />

      {/* =================================================
          ICON
      ================================================= */}

      <Animated.View
        style={[
          styles.iconWrapper,
          iconAnimatedStyle,
        ]}
      >
        {options.tabBarIcon &&
          options.tabBarIcon({
            focused: isFocused,
            color: iconColor,
            size: 24,
          })}
      </Animated.View>

      {/* =================================================
          LABEL
      ================================================= */}

      <Animated.View
        style={[
          styles.labelContainer,
          labelAnimatedStyle,
        ]}
      >
        <Text style={styles.label}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/* =========================================================
   CUSTOM TAB BAR
========================================================= */

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingBottom: Math.max(
            insets.bottom,
            10
          ),
        },
      ]}
    >
      {/* =================================================
          GLASS BAR
      ================================================= */}

      <View style={styles.glassBar}>
        {/* ---------------------------------------------
            BACKGROUND BLUR
        ---------------------------------------------- */}

        <BlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />

        {/* ---------------------------------------------
            LIQUID GLASS SKIA LAYER
        ---------------------------------------------- */}

        <Canvas
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          {/* Main glass */}
          <RoundedRect
            x={0}
            y={0}
            width={430}
            height={BAR_HEIGHT}
            r={BAR_RADIUS}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, BAR_HEIGHT)}
              colors={[
                "rgba(255,255,255,0.28)",
                "rgba(255,255,255,0.08)",
              ]}
            />
          </RoundedRect>

          {/* -------------------------------------------
              TOP REFLECTION
          -------------------------------------------- */}

          <Rect
            x={30}
            y={1}
            width={370}
            height={1}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(370, 0)}
              colors={[
                "rgba(255,255,255,0)",
                "rgba(255,255,255,0.65)",
                "rgba(255,255,255,0)",
              ]}
            />
          </Rect>

          {/* -------------------------------------------
              LOWER GLASS LIGHT
          -------------------------------------------- */}

          <Rect
            x={50}
            y={BAR_HEIGHT - 2}
            width={330}
            height={1}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(330, 0)}
              colors={[
                "rgba(255,255,255,0)",
                "rgba(255,255,255,0.20)",
                "rgba(255,255,255,0)",
              ]}
            />
          </Rect>
        </Canvas>

        {/* ---------------------------------------------
            VERY SUBTLE WHITE TINT
        ---------------------------------------------- */}

        <View
          pointerEvents="none"
          style={styles.glassTint}
        />

        {/* ---------------------------------------------
            GLASS BORDER
        ---------------------------------------------- */}

        <View
          pointerEvents="none"
          style={styles.glassBorder}
        />

        {/* ---------------------------------------------
            TAB ITEMS
        ---------------------------------------------- */}

        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } =
              descriptors[route.key];

            const isFocused =
              state.index === index;

            const onPress = () => {
              const event =
                navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

              if (
                !isFocused &&
                !event.defaultPrevented
              ) {
                navigation.navigate(
                  route.name,
                  route.params
                );
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabBarItem
                key={route.key}
                isFocused={isFocused}
                options={options}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =====================================================
     CONTAINER
  ===================================================== */

  container: {
    position: "absolute",

    left: 0,
    right: 0,
    bottom: 0,

    alignItems: "center",

    paddingHorizontal: 12,
  },

  /* =====================================================
     MAIN GLASS BAR
  ===================================================== */

  glassBar: {
    width: "94%",

    maxWidth: 430,

    height: BAR_HEIGHT,

    borderRadius: BAR_RADIUS,

    overflow: "hidden",

    position: "relative",

    backgroundColor:
      "rgba(255,255,255,0.08)",

    ...Platform.select({
      ios: {
        shadowColor: "#000",

        shadowOffset: {
          width: 0,
          height: 12,
        },

        shadowOpacity: 0.16,

        shadowRadius: 25,
      },

      android: {
        elevation: 16,
      },
    }),
  },

  /* =====================================================
     GLASS TINT
  ===================================================== */

  glassTint: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  /* =====================================================
     OUTER BORDER
  ===================================================== */

  glassBorder: {
    ...StyleSheet.absoluteFillObject,

    borderRadius: BAR_RADIUS,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.32)",
  },

  /* =====================================================
     TAB ROW
  ===================================================== */

  tabRow: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-around",

    paddingHorizontal: 7,
  },

  /* =====================================================
     TAB ITEM
  ===================================================== */

  tabItem: {
    flex: 1,

    height: 60,

    alignItems: "center",

    justifyContent: "center",

    position: "relative",

    borderRadius: 30,
  },

  /* =====================================================
     ACTIVE GLASS
  ===================================================== */

  activeGlass: {
    position: "absolute",

    width: ACTIVE_WIDTH,

    height: ACTIVE_HEIGHT,

    borderRadius: ACTIVE_RADIUS,

    overflow: "hidden",

    backgroundColor:
      "rgba(255,255,255,0.10)",

    ...Platform.select({
      ios: {
        shadowColor: "#000",

        shadowOffset: {
          width: 0,
          height: 4,
        },

        shadowOpacity: 0.10,

        shadowRadius: 10,
      },

      android: {
        elevation: 4,
      },
    }),
  },

  activeGlassBorder: {
    ...StyleSheet.absoluteFillObject,

    borderRadius: ACTIVE_RADIUS,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.38)",
  },

  /* =====================================================
     ICON
  ===================================================== */

  iconWrapper: {
    zIndex: 10,

    alignItems: "center",

    justifyContent: "center",
  },

  /* =====================================================
     LABEL
  ===================================================== */

  labelContainer: {
    position: "absolute",

    bottom: 2,

    zIndex: 20,
  },

  label: {
    ...typography.tiny,

    fontSize: 9,

    fontWeight: "800",

    color: colors.primary,

    letterSpacing: 0.15,
  },
});