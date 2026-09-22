import {
  Canvas,
  DashPathEffect,
  Path,
  Skia,
  Image as SkiaImage,
  useImage,
} from "@shopify/react-native-skia";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GameLoader from "@/components/GameLoader";
import { supabase } from "@/services/supabase";
import { DailyRewardModal } from "../../components/DailyRewardModal";
import { NoLivesModal } from "../../components/NoLivesModal";
import { useApp } from "../../context/AppContext";

// ============================================================
// ASSETS
// ============================================================

const BG_01 = require("../../assets/world/bg-01.png");
const BG_02 = require("../../assets/world/bg-02.png");
const BG_03 = require("../../assets/world/bg-03.png");

const ISLAND_01 = require("../../assets/world/island-basics.png");
const ISLAND_02 = require("../../assets/world/island-conversations.png");
const ISLAND_03 = require("../../assets/world/island-daily-life.png");

// ============================================================
// TYPES
// ============================================================

export type Lesson = {
  id: number;
  title: string;
  completed?: boolean;
  status?: "AVAILABLE" | "LOCKED" | "COMPLETED";
  description?: string;
  order_index?: number;
  total_questions?: number;
  completed_questions?: number;
  best_score?: number;
  xp_reward?: number;
  estimated_minutes?: number;
  icon_url?: string | null;
  image_url?: string | null;
};

export type Unit = {
  id: number;
  course_id?: number;
  order_index: number;
  title: string;
  description: string;
  completed?: boolean;
  unlocked?: boolean;
  icon_url?: string | null;
  image_url?: string | null;
  lessons: Lesson[];
};

// ============================================================
// WORLD ASSETS
// ============================================================

const WORLD_ASSETS = [
  {
    background: BG_01,
    island: ISLAND_01,
  },
  {
    background: BG_02,
    island: ISLAND_02,
  },
  {
    background: BG_03,
    island: ISLAND_03,
  },
];

// ============================================================
// CONSTANTS
// ============================================================

const NODE_MIN_SIZE = 54;
const NODE_MAX_SIZE = 62;

const MIN_UNIT_HEIGHT = 820;

const HEADER_MAP_OFFSET = 220;
const MAP_BOTTOM_PADDING = 120;
const BACKGROUND_OVERLAP = 160;

// Header behavior
const HEADER_FULL_HEIGHT = 215;
const HEADER_COMPACT_HEIGHT = 70;

const HEADER_COMPACT_START = 25;
const HEADER_HIDE_START = 145;

// ============================================================
// HELPERS
// ============================================================

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getGreeting(): string {
  const hours = new Date().getHours();
  if (hours < 12) return "Good morning,";
  if (hours < 18) return "Good afternoon,";
  return "Good evening,";
}

// ============================================================
// UNIT HEIGHT
// ============================================================

function getUnitHeight(unit: Unit) {
  const lessonCount = unit.lessons?.length || 0;
  return Math.max(MIN_UNIT_HEIGHT, 315 + lessonCount * 145 + 70);
}

// ============================================================
// LESSON PATH
// ============================================================

function createLessonPath(points: { x: number; y: number }[]) {
  if (points.length < 2) {
    return null;
  }

  const builder = Skia.PathBuilder.Make();
  builder.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];

    const dx = current.x - previous.x;
    const dy = current.y - previous.y;

    builder.cubicTo(
      previous.x + dx * 0.4,
      previous.y + dy * 0.1,
      current.x - dx * 0.4,
      current.y - dy * 0.1,
      current.x,
      current.y
    );
  }

  return builder.build();
}

// ============================================================
// OUTGOING CONNECTOR
// ============================================================

function createOutgoingPath(
  lastPoint: { x: number; y: number },
  width: number,
  unitHeight: number
) {
  const builder = Skia.PathBuilder.Make();
  const targetX = width * 0.5;
  const targetY = unitHeight + 8;
  const direction = targetX > lastPoint.x ? 1 : -1;

  builder.moveTo(lastPoint.x, lastPoint.y);
  builder.cubicTo(
    lastPoint.x + direction * width * 0.04,
    lastPoint.y + 45,
    targetX - direction * width * 0.06,
    unitHeight - 45,
    targetX,
    targetY
  );

  return builder.build();
}

// ============================================================
// INCOMING CONNECTOR
// ============================================================

function createIncomingPath(
  startX: number,
  firstPoint: { x: number; y: number },
  width: number
) {
  const builder = Skia.PathBuilder.Make();
  const centerX = width * 0.5;
  const direction = firstPoint.x > centerX ? 1 : -1;

  builder.moveTo(startX, -8);
  builder.cubicTo(
    startX,
    55,
    centerX + direction * width * 0.16,
    firstPoint.y * 0.4,
    centerX + direction * width * 0.08,
    firstPoint.y * 0.6
  );

  builder.cubicTo(
    centerX + direction * width * 0.03,
    firstPoint.y * 0.78,
    firstPoint.x - direction * width * 0.03,
    firstPoint.y - 35,
    firstPoint.x,
    firstPoint.y
  );

  return builder.build();
}

// ============================================================
// DOTTED PATH
// ============================================================

function DottedPath({
  path,
}: {
  path: ReturnType<typeof createLessonPath>;
}) {
  if (!path) {
    return null;
  }

  return (
    <Path
      path={path}
      color="rgba(255,255,255,0.95)"
      style="stroke"
      strokeWidth={7}
      strokeCap="round"
    >
      <DashPathEffect intervals={[14, 13]} phase={0} />
    </Path>
  );
}

// ============================================================
// LESSON NODE
// ============================================================

function LessonNode({
  lesson,
  x,
  y,
  size,
  labelWidth,
  onPress,
}: {
  lesson: Lesson;
  x: number;
  y: number;
  size: number;
  labelWidth: number;
  onPress: () => void;
}) {
  const isCompleted = lesson.status === "COMPLETED" || lesson.completed === true;
  const isLocked = lesson.status === "LOCKED";

  return (
    <View
      style={[
        styles.lessonWrapper,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={isLocked}
        style={[
          styles.lessonNode,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          isCompleted
            ? styles.lessonCompleted
            : isLocked
              ? styles.lessonLocked
              : styles.lessonCurrent,
        ]}
      >
        <Text style={styles.lessonIcon}>
          {isCompleted ? "✓" : isLocked ? "🔒" : "▶"}
        </Text>
      </Pressable>

      <View
        style={[
          styles.lessonLabel,
          {
            maxWidth: labelWidth,
          },
        ]}
      >
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[
            styles.lessonLabelText,
            isLocked && { color: "rgba(19,45,61,0.5)" },
          ]}
        >
          {lesson.title}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// CONTINUOUS WORLD BACKGROUND
// ============================================================

function WorldBackground({
  width,
  units,
}: {
  width: number;
  units: Unit[];
}) {
  let unitTop = HEADER_MAP_OFFSET;

  const totalHeight =
    units.reduce((total, unit) => total + getUnitHeight(unit), 0) +
    HEADER_MAP_OFFSET +
    MAP_BOTTOM_PADDING;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.worldBackground,
        {
          width,
          height: totalHeight,
        },
      ]}
    >
      {units.map((unit, index) => {
        const assets = WORLD_ASSETS[index % WORLD_ASSETS.length];
        const unitHeight = getUnitHeight(unit);

        let imageTop = 0;
        let imageHeight = unitHeight;

        if (index === 0) {
          imageTop = 0;
          imageHeight =
            HEADER_MAP_OFFSET + unitHeight + BACKGROUND_OVERLAP;
        } else {
          imageTop = unitTop - BACKGROUND_OVERLAP;
          imageHeight = unitHeight + BACKGROUND_OVERLAP * 2;
        }

        unitTop += unitHeight;

        return (
          <Image
            key={`world-bg-${unit.id}`}
            source={assets.background}
            resizeMode="cover"
            style={[
              styles.worldBackgroundImage,
              {
                top: imageTop,
                width,
                height: imageHeight,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ============================================================
// MAP UNIT
// ============================================================

function MapUnit({
  unit,
  index,
  width,
  incomingStartX,
  onLessonPress,
}: {
  unit: Unit;
  index: number;
  width: number;
  incomingStartX: number | null;
  onLessonPress: (lesson: Lesson, unit: Unit) => void;
}) {
  const assets = WORLD_ASSETS[index % WORLD_ASSETS.length];
  const island = useImage(assets.island);

  // Responsive sizing
  const nodeSize = clamp(width * 0.135, NODE_MIN_SIZE, NODE_MAX_SIZE);
  const labelWidth = clamp(width * 0.28, 96, 132);

  // Island sizing
  const islandWidth = clamp(width * 0.68, 245, 340);
  const islandHeight = islandWidth * 0.7;
  const islandLeft = (width - islandWidth) / 2;
  const islandTop = 25;

  const unitHeight = getUnitHeight(unit);
  const lessons = unit.lessons || [];

  const lessonPoints = useMemo(() => {
    const right = width * 0.71;
    const left = width * 0.29;
    const startY = Math.max(410, islandHeight + 170);
    const spacing = 135;

    return lessons.map((_, lessonIndex) => ({
      x: lessonIndex % 2 === 0 ? right : left,
      y: startY + lessonIndex * spacing,
    }));
  }, [width, lessons, islandHeight]);

  const lessonPath = useMemo(
    () => createLessonPath(lessonPoints),
    [lessonPoints]
  );

  const incomingPath = useMemo(() => {
    if (index === 0 || incomingStartX === null || lessonPoints.length === 0) {
      return null;
    }

    return createIncomingPath(incomingStartX, lessonPoints[0], width);
  }, [index, incomingStartX, lessonPoints, width]);

  const lastPoint = lessonPoints[lessonPoints.length - 1];

  const outgoingPath = useMemo(() => {
    if (!lastPoint) {
      return null;
    }

    return createOutgoingPath(lastPoint, width, unitHeight);
  }, [lastPoint, width, unitHeight]);

  return (
    <View
      style={[
        styles.unit,
        {
          width,
          height: unitHeight,
        },
      ]}
    >
      {/* Dotted path */}
      <Canvas
        pointerEvents="none"
        style={[
          styles.pathCanvas,
          {
            width,
            height: unitHeight,
          },
        ]}
      >
        {incomingPath && <DottedPath path={incomingPath} />}
        {lessonPath && <DottedPath path={lessonPath} />}
        {outgoingPath && <DottedPath path={outgoingPath} />}
      </Canvas>

      {/* Island Graphic & Info */}
      <View
        pointerEvents="none"
        style={[
          styles.island,
          {
            left: islandLeft,
            top: islandTop,
            width: islandWidth,
            height: islandHeight,
          },
        ]}
      >
        {island && (
          <Canvas
            style={{
              width: islandWidth,
              height: islandHeight,
            }}
          >
            <SkiaImage
              image={island}
              x={0}
              y={0}
              width={islandWidth}
              height={islandHeight}
              fit="contain"
            />
          </Canvas>
        )}

        <View
          style={[
            styles.unitInfoGlass,
            {
              left: islandWidth * 0.17,
              width: islandWidth * 0.66,
              top: islandHeight * 0.33,
            },
          ]}
        >
          <View style={styles.unitPill}>
            <Text style={styles.unitPillText}>
              UNIT {unit.order_index}
            </Text>
          </View>

          <Text numberOfLines={1} style={styles.unitTitle}>
            {unit.title}
          </Text>

          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={styles.unitDescription}
          >
            {unit.description}
          </Text>
        </View>
      </View>

      {/* Lesson nodes */}
      {lessons.map((lesson, lessonIndex) => {
        const point = lessonPoints[lessonIndex];
        if (!point) return null;

        return (
          <LessonNode
            key={lesson.id}
            lesson={lesson}
            x={point.x}
            y={point.y}
            size={nodeSize}
            labelWidth={labelWidth}
            onPress={() => onLessonPress(lesson, unit)}
          />
        );
      })}
    </View>
  );
}

// ============================================================
// FULL HEADER
// ============================================================

function FullHeader({
  topInset,
  greeting,
  userName,
  subtitle,
  streak,
  xp,
  gems,
  lives,
  isDailyRewardAvailable,
  onStreakPress,
  onLivesPress,
}: {
  topInset: number;
  greeting: string;
  userName: string;
  subtitle: string;
  streak: number;
  xp: number;
  gems: number;
  lives: number;
  isDailyRewardAvailable?: boolean;
  onStreakPress?: () => void;
  onLivesPress?: () => void;
}) {
  return (
    <View
      style={[
        styles.fullHeader,
        {
          paddingTop: topInset + 7,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{userName} 👋</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <GlassStreak
          streak={streak}
          isDailyRewardAvailable={isDailyRewardAvailable}
          onPress={onStreakPress}
        />
      </View>

      <Stats
        streak={streak}
        xp={xp}
        gems={gems}
        lives={lives}
        onLivesPress={onLivesPress}
      />
    </View>
  );
}

// ============================================================
// COMPACT HEADER
// ============================================================

function CompactHeader({
  topInset,
  userName,
  streak,
  isDailyRewardAvailable,
  onStreakPress,
}: {
  topInset: number;
  userName: string;
  streak: number;
  isDailyRewardAvailable?: boolean;
  onStreakPress?: () => void;
}) {
  return (
    <View
      style={[
        styles.compactHeader,
        {
          paddingTop: topInset + 6,
        },
      ]}
    >
      <Text numberOfLines={1} style={styles.compactName}>
        {userName} 👋
      </Text>

      <GlassStreak
        streak={streak}
        isDailyRewardAvailable={isDailyRewardAvailable}
        onPress={onStreakPress}
      />
    </View>
  );
}

// ============================================================
// STREAK
// ============================================================

function GlassStreak({
  streak,
  isDailyRewardAvailable,
  onPress,
}: {
  streak: number;
  isDailyRewardAvailable?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.headerStreak,
        isDailyRewardAvailable && styles.headerStreakRewardReady,
      ]}
      onPress={onPress}
    >
      <Text style={styles.streakEmoji}>
        {isDailyRewardAvailable ? "🎁" : "🔥"}
      </Text>
      <Text style={styles.streakNumber}>{streak}</Text>
      {isDailyRewardAvailable && <View style={styles.streakBadgeDot} />}
    </Pressable>
  );
}

// ============================================================
// STATS
// ============================================================

function Stats({
  streak,
  xp,
  gems,
  lives,
  onLivesPress,
}: {
  streak: number;
  xp: number;
  gems: number;
  lives: number;
  onLivesPress?: () => void;
}) {
  return (
    <View style={styles.stats}>
      <Stat icon="🔥" value={String(streak)} label="Streak" />
      <Stat icon="⭐" value={String(xp)} label="XP" />
      <Stat icon="💎" value={String(gems)} label="Gems" />
      <Pressable style={{ flex: 1 }} onPress={onLivesPress}>
        <Stat icon="❤️" value={String(lives)} label="Hearts" />
      </Pressable>
    </View>
  );
}

// ============================================================
// STAT
// ============================================================

function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ============================================================
// SETTINGS
// ============================================================

function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.settings} onPress={onPress}>
      <Text style={styles.settingsText}>⚙</Text>
    </Pressable>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function HomeMap() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user, stats, selectedTargetLang, refreshStats } = useApp();

  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDailyXpAvailable, setIsDailyXpAvailable] = useState<boolean | null>(null);
  const [showDailyRewardModal, setShowDailyRewardModal] = useState(false);
  const [showNoLivesModal, setShowNoLivesModal] = useState(false);

  const hasShownDailyModalRef = useRef(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");

  // Dedicated daily reward check logic
  const checkDailyReward = useCallback(async (openModalIfAvailable = false) => {
    try {
      const { data, error } = await supabase.rpc("is_daily_xp_available");
      if (error) {
        console.warn("[homemap] is_daily_xp_available error:", error);
        return;
      }
      const available = Boolean(data);
      setIsDailyXpAvailable(available);

      if (available) {
        if (openModalIfAvailable || !hasShownDailyModalRef.current) {
          hasShownDailyModalRef.current = true;
          setTimeout(() => {
            setShowDailyRewardModal(true);
          }, 600);
        }
      }
    } catch (e) {
      console.error("[homemap] checkDailyReward exception:", e);
    }
  }, []);

  // Only load the data when user comes the first time or returns from any other page
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          const [curriculumRes, dailyXpRes] = await Promise.all([
            supabase.rpc("get_curriculum"),
            supabase.rpc("is_daily_xp_available"),
            refreshStats(),
          ]);

          if (!isActive) return;

          if (curriculumRes.error) {
            console.error("get_curriculum error in homemap:", curriculumRes.error);
          } else if (curriculumRes.data) {
            setUnits(curriculumRes.data as Unit[]);
          }

          if (dailyXpRes.error) {
            console.warn("is_daily_xp_available error in homemap:", dailyXpRes.error);
          } else if (dailyXpRes.data !== undefined) {
            const available = Boolean(dailyXpRes.data);
            setIsDailyXpAvailable(available);

            if (available && !hasShownDailyModalRef.current) {
              hasShownDailyModalRef.current = true;
              setTimeout(() => {
                if (isActive) {
                  setShowDailyRewardModal(true);
                }
              }, 800);
            }
          }
        } catch (err) {
          console.error("Error loading curriculum in homemap:", err);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [refreshStats])
  );

  // Re-check daily reward as soon as user session is ready on cold start
  useEffect(() => {
    if (user?.id) {
      checkDailyReward(false);
    }
  }, [user?.id, checkDailyReward]);

  const handleClaimDailyReward = async () => {
    try {
      const res = await supabase.rpc("claim_daily_reward", { p_reward_xp: 25 });
      console.log("[homemap] Daily reward claimed:", res);
      await refreshStats();
      setIsDailyXpAvailable(false);
    } catch (e) {
      console.error("Failed to claim daily reward:", e);
    }
  };

  // Scroll Direction Tracking
  const handleScroll = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;

    if (currentY > lastScrollY.current + 2) {
      if (scrollDirection !== "up") {
        setScrollDirection("up");
      }
    } else if (currentY < lastScrollY.current - 2) {
      if (scrollDirection !== "down") {
        setScrollDirection("down");
      }
    }

    lastScrollY.current = Math.max(0, currentY);
  };

  const unitConnectorX = width * 0.5;

  // Lesson Press Handler
  const handleLessonPress = (lesson: Lesson, unit: Unit) => {
    if (lesson.status === "LOCKED") {
      return;
    }

    if (stats?.lives <= 0) {
      setShowNoLivesModal(true);
      return;
    }

    router.push({
      pathname: "/lesson",
      params: {
        lessonId: String(lesson.id),
        title: lesson.title,
      },
    });
  };

  const totalMapHeight = useMemo(() => {
    return (
      units.reduce((total, unit) => total + getUnitHeight(unit), 0) +
      HEADER_MAP_OFFSET +
      MAP_BOTTOM_PADDING
    );
  }, [units]);

  // Header Animations
  const fullHeaderOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_COMPACT_START, HEADER_HIDE_START],
    outputRange: [1, 0.35, 0],
    extrapolate: "clamp",
  });

  const fullHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_COMPACT_START, HEADER_HIDE_START],
    outputRange: [0, -25, -100],
    extrapolate: "clamp",
  });

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_COMPACT_START, HEADER_HIDE_START, 220],
    outputRange: [0, 1, 1, 0],
    extrapolate: "clamp",
  });

  const compactHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_COMPACT_START, HEADER_HIDE_START, 220],
    outputRange: [-25, 0, 0, -70],
    extrapolate: "clamp",
  });

  const settingsOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_COMPACT_START, HEADER_HIDE_START],
    outputRange: [1, 0.6, 0],
    extrapolate: "clamp",
  });

  // Dynamic header values
  const greeting = getGreeting();
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Learner";
  const subtitle = `Continue your ${selectedTargetLang?.name || "English"} journey`;
  const streak = stats?.streak ?? 0;
  const xp = stats?.xp ?? 0;
  const gems = stats?.gems ?? 0;
  const lives = stats?.lives ?? 5;

  return (
    <View style={styles.screen}>
      {/* Map Canvas / ScrollView */}
      <View style={styles.mapArea}>
        {loading && units.length === 0 ? (
          <View style={styles.loadingContainer}>
            <GameLoader
              variant="full"
              message="Loading your adventure map... ✨"
            />
          </View>
        ) : (
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [
                {
                  nativeEvent: {
                    contentOffset: {
                      y: scrollY,
                    },
                  },
                },
              ],
              {
                useNativeDriver: true,
                listener: handleScroll,
              }
            )}
            contentContainerStyle={[
              styles.mapContent,
              {
                minHeight: totalMapHeight,
                paddingTop: HEADER_MAP_OFFSET,
                paddingBottom:
                  MAP_BOTTOM_PADDING + insets.bottom,
              },
            ]}
          >
            {/* Background */}
            <WorldBackground width={width} units={units} />

            {/* Units */}
            {units.map((unit, index) => (
              <MapUnit
                key={unit.id}
                unit={unit}
                index={index}
                width={width}
                incomingStartX={
                  index === 0 ? null : unitConnectorX
                }
                onLessonPress={handleLessonPress}
              />
            ))}

            {units.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No curriculum available yet.
                </Text>
              </View>
            )}
          </Animated.ScrollView>
        )}
      </View>

      {/* FULL HEADER */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.headerLayer,
          {
            opacity: fullHeaderOpacity,
            transform: [{ translateY: fullHeaderTranslateY }],
          },
        ]}
      >
        <FullHeader
          topInset={insets.top}
          greeting={greeting}
          userName={userName}
          subtitle={subtitle}
          streak={streak}
          xp={xp}
          gems={gems}
          lives={lives}
          isDailyRewardAvailable={Boolean(isDailyXpAvailable)}
          onStreakPress={() => {
            if (isDailyXpAvailable) {
              setShowDailyRewardModal(true);
            } else {
              checkDailyReward(true);
            }
          }}
          onLivesPress={() => {
            if (lives <= 0) setShowNoLivesModal(true);
          }}
        />
      </Animated.View>

      {/* COMPACT HEADER */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.compactLayer,
          {
            opacity: compactHeaderOpacity,
            transform: [{ translateY: compactHeaderTranslateY }],
          },
        ]}
      >
        <CompactHeader
          topInset={insets.top}
          userName={userName}
          streak={streak}
          isDailyRewardAvailable={Boolean(isDailyXpAvailable)}
          onStreakPress={() => {
            if (isDailyXpAvailable) {
              setShowDailyRewardModal(true);
            } else {
              checkDailyReward(true);
            }
          }}
        />
      </Animated.View>

      {/* SETTINGS BUTTON */}
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.settingsLayer,
          {
            opacity: settingsOpacity,
          },
        ]}
      >
        <SettingsButton
          onPress={() => {
            router.push("/(tabs)/profile");
          }}
        />
      </Animated.View>

      {/* DAILY REWARD MODAL */}
      <DailyRewardModal
        visible={showDailyRewardModal}
        onClose={() => setShowDailyRewardModal(false)}
        onClaim={handleClaimDailyReward}
        rewardXp={25}
        rewardGems={10}
        streakCount={stats?.streak || 1}
      />

      {/* NO LIVES MODAL */}
      <NoLivesModal
        visible={showNoLivesModal}
        onClose={() => setShowNoLivesModal(false)}
      />
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#43BFE5",
  },

  mapArea: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#43BFE5",
  },

  mapContent: {
    position: "relative",
    width: "100%",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },

  emptyContainer: {
    paddingTop: 120,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
  },

  worldBackground: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 0,
    overflow: "hidden",
    backgroundColor: "#43BFE5",
  },

  worldBackgroundImage: {
    position: "absolute",
    left: 0,
    zIndex: 0,
  },

  headerLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 100,
  },

  compactLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 105,
  },

  settingsLayer: {
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 120,
  },

  fullHeader: {
    paddingHorizontal: 18,
    backgroundColor: "transparent",
  },

  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerText: {
    flex: 1,
    paddingRight: 8,
  },

  greeting: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "600",
    color: "rgba(16,39,54,0.90)",
    textShadowColor: "rgba(255,255,255,0.60)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  name: {
    marginTop: 0,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900",
    color: "rgba(8,28,43,0.94)",
    textShadowColor: "rgba(255,255,255,0.70)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 5,
  },

  subtitle: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "rgba(28,57,76,0.85)",
    textShadowColor: "rgba(255,255,255,0.70)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  compactHeader: {
    minHeight: HEADER_COMPACT_HEIGHT,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.30)",
  },

  compactName: {
    flex: 1,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    color: "rgba(8,29,44,0.95)",
    textShadowColor: "rgba(255,255,255,0.65)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  headerStreak: {
    minWidth: 74,
    height: 46,
    paddingHorizontal: 11,
    marginLeft: 10,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.76)",
    shadowColor: "rgba(15,52,72,0.38)",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 5,
  },

  streakEmoji: {
    fontSize: 20,
  },

  streakNumber: {
    marginLeft: 4,
    fontSize: 18,
    fontWeight: "900",
    color: "rgba(177,95,0,0.95)",
  },

  headerStreakRewardReady: {
    borderColor: "rgba(255, 180, 0, 0.90)",
    backgroundColor: "rgba(255, 240, 200, 0.70)",
  },

  streakBadgeDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#FF3D00",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },

  stats: {
    marginTop: 10,
    width: "100%",
    flexDirection: "row",
  },

  stat: {
    flex: 1,
    minHeight: 70,
    marginHorizontal: 3,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    shadowColor: "rgba(13,55,76,0.35)",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 4,
  },

  statIcon: {
    fontSize: 18,
    marginBottom: 0,
  },

  statValue: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: "900",
    color: "rgba(12,35,51,0.94)",
  },

  statLabel: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(42,67,83,0.82)",
  },

  settings: {
    position: "absolute",
    right: 15,
    top: 226,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    shadowColor: "rgba(18,54,75,0.42)",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.20,
    shadowRadius: 9,
    elevation: 8,
  },

  settingsText: {
    fontSize: 24,
    color: "rgba(25,49,65,0.90)",
  },

  unit: {
    position: "relative",
    overflow: "visible",
    zIndex: 1,
  },

  pathCanvas: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 2,
  },

  island: {
    position: "absolute",
    zIndex: 10,
    overflow: "visible",
  },

  unitInfoGlass: {
    position: "absolute",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    shadowColor: "rgba(20,53,70,0.30)",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 5,
  },

  unitPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.58)",
  },

  unitPillText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "rgba(34,66,88,0.82)",
  },

  unitTitle: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    textAlign: "center",
    color: "rgba(17,42,57,0.95)",
  },

  unitDescription: {
    marginTop: 1,
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "600",
    textAlign: "center",
    color: "rgba(38,63,78,0.80)",
  },

  lessonCount: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 16,
  },

  lessonCountText: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 13,
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.95)",
    backgroundColor: "rgba(27,70,92,0.34)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
  },

  lessonWrapper: {
    position: "absolute",
    alignItems: "center",
    zIndex: 30,
    elevation: 30,
  },

  lessonNode: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: "rgba(255,255,255,0.96)",
    shadowColor: "rgba(16,56,77,0.55)",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.30,
    shadowRadius: 9,
    elevation: 14,
  },

  lessonCompleted: {
    backgroundColor: "rgba(44,191,120,0.94)",
  },

  lessonCurrent: {
    backgroundColor: "rgba(65,132,241,0.94)",
  },

  lessonLocked: {
    backgroundColor: "rgba(140, 160, 175, 0.90)",
    borderColor: "rgba(220, 230, 240, 0.85)",
  },

  lessonIcon: {
    fontSize: 21,
    fontWeight: "900",
    color: "rgba(255,255,255,0.98)",
  },

  lessonLabel: {
    marginTop: 6,
    minWidth: 78,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.70)",
    shadowColor: "rgba(22,56,75,0.30)",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  lessonLabelText: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "800",
    textAlign: "center",
    color: "rgba(19,45,61,0.92)",
  },
});