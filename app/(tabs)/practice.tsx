import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const mascotImage = require("@/assets/images/mascot.png");

type Difficulty = "beginner" | "intermediate" | "advanced";

type ConversationStyle =
  | "guided_conversation"
  | "free_conversation"
  | "roleplay"
  | "question_answer";

interface PresetScenario {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  topic: string;
  goal: string;
  badge: string;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "travel",
    title: "Travel & Airport",
    icon: "airplane-outline",
    topic: "Airport & Flight Booking",
    goal: "Ask for directions and book tickets confidently",
    badge: "Popular",
  },
  {
    id: "interview",
    title: "Job Interview",
    icon: "briefcase-outline",
    topic: "Professional Self Introduction",
    goal: "Answer common interview questions smoothly",
    badge: "Career",
  },
  {
    id: "cafe",
    title: "Ordering Coffee",
    icon: "cafe-outline",
    topic: "Cafe & Restaurant Order",
    goal: "Order food and express dietary preferences",
    badge: "Daily",
  },
  {
    id: "casual",
    title: "Casual Chat",
    icon: "chatbubbles-outline",
    topic: "Hobbies & Weekend Plans",
    goal: "Maintain friendly small talk with strangers",
    badge: "Fun",
  },
  {
    id: "doctor",
    title: "Doctor Visit",
    icon: "medical-outline",
    topic: "Describing Symptoms",
    goal: "Explain health symptoms and understand advice",
    badge: "Health",
  },
  {
    id: "shopping",
    title: "Shopping & Bargaining",
    icon: "cart-outline",
    topic: "Store Shopping & Discounts",
    goal: "Ask about sizes, prices, and return policy",
    badge: "Daily",
  },
];

/* ============================================================
   COLOR PALETTE (REF: LessonStartView / Shop / Profile)
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
  glassBg: "rgba(104,71,245,0.035)",
  glassBgSelected: "rgba(104,71,245,0.08)",
  glassBorder: "rgba(104,71,245,0.16)",
  glassBorderSelected: "rgba(104,71,245,0.32)",
  glassTopHighlight: "rgba(255,255,255,0.70)",
};

export default function FreeTeacherSetupScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [conversationStyle, setConversationStyle] =
    useState<ConversationStyle>("guided_conversation");

  const [focusedInput, setFocusedInput] = useState<"topic" | "goal" | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  function applyPreset(preset: PresetScenario) {
    setSelectedPresetId(preset.id);
    setTopic(preset.topic);
    setGoal(preset.goal);
  }

  function handleStart() {
    router.push({
      pathname: "/practice-call",
      params: {
        topic: topic.trim(),
        goal: goal.trim(),
        difficulty,
        conversationStyle,
      },
    });
  }

  // ============================================================
  // SKIA BACKGROUND (Matches shop.tsx / profile.tsx)
  // ============================================================

  const SkiaBg = () => (
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
  );

  return (
    <View style={styles.screen}>
      <SkiaBg />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconPod}>
              <Ionicons name="school" size={20} color={COLORS.purple} />
            </View>

            <View>
              <Text style={styles.headerTitle}>AI Teacher</Text>
              <Text style={styles.headerSubtitle}>Live English Practice</Text>
            </View>
          </View>

          <View style={styles.headerTimerPill}>
            <Ionicons name="time-outline" size={14} color={COLORS.purple} />
            <Text style={styles.headerTimerText}>2:00 Limit</Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Mascot Hero */}
          <View style={styles.mascotHero}>
            <View style={styles.mascotGlow} />
            <Image
              source={mascotImage}
              contentFit="contain"
              style={styles.setupMascot}
            />
          </View>

          <Text style={styles.setupTitle}>
            What do you want to{"\n"}practice today?
          </Text>
          <Text style={styles.setupSubtitle}>
            Configure your AI Teacher and start an immersive live session.
          </Text>

          {/* Quick Preset Scenarios */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="sparkles" size={16} color={COLORS.purple} />
            <Text style={styles.sectionHeaderTitle}>Quick Scenarios</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsContainer}
          >
            {PRESET_SCENARIOS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <TouchableOpacity
                  key={preset.id}
                  activeOpacity={0.8}
                  onPress={() => applyPreset(preset)}
                  style={[
                    styles.presetCard,
                    isSelected && styles.presetCardSelected,
                  ]}
                >
                  <View pointerEvents="none" style={styles.glassTopHighlight} />
                  <View style={styles.presetTopRow}>
                    <View
                      style={[
                        styles.presetIconPod,
                        isSelected && styles.presetIconPodSelected,
                      ]}
                    >
                      <Ionicons
                        name={preset.icon}
                        size={16}
                        color={isSelected ? COLORS.white : COLORS.purple}
                      />
                    </View>
                    <View style={styles.presetBadge}>
                      <Text style={styles.presetBadgeText}>{preset.badge}</Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.presetTitle,
                      isSelected && styles.presetTitleSelected,
                    ]}
                  >
                    {preset.title}
                  </Text>
                  <Text style={styles.presetGoalText} numberOfLines={2}>
                    {preset.goal}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Topic Field */}
          <Text style={styles.glassLabel}>Topic</Text>
          <View
            style={[
              styles.glassInputWrap,
              focusedInput === "topic" && styles.glassInputWrapFocused,
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={focusedInput === "topic" ? COLORS.purple : COLORS.textMuted}
            />
            <TextInput
              value={topic}
              onChangeText={(text) => {
                setTopic(text);
                setSelectedPresetId(null);
              }}
              onFocus={() => setFocusedInput("topic")}
              onBlur={() => setFocusedInput(null)}
              placeholder="e.g. Travel, cricket, daily life"
              placeholderTextColor={COLORS.textMuted}
              style={styles.glassInput}
            />
            {topic.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setTopic("");
                  setSelectedPresetId(null);
                }}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Goal Field */}
          <Text style={styles.glassLabel}>Learning Goal</Text>
          <View
            style={[
              styles.glassInputWrap,
              focusedInput === "goal" && styles.glassInputWrapFocused,
            ]}
          >
            <Ionicons
              name="flag-outline"
              size={18}
              color={focusedInput === "goal" ? COLORS.purple : COLORS.textMuted}
            />
            <TextInput
              value={goal}
              onChangeText={(text) => {
                setGoal(text);
                setSelectedPresetId(null);
              }}
              onFocus={() => setFocusedInput("goal")}
              onBlur={() => setFocusedInput(null)}
              placeholder="e.g. Speak confidently with fluent vocabulary"
              placeholderTextColor={COLORS.textMuted}
              style={styles.glassInput}
            />
            {goal.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setGoal("");
                  setSelectedPresetId(null);
                }}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Difficulty Level */}
          <Text style={styles.glassLabel}>Difficulty Level</Text>
          <View style={styles.optionRow}>
            {(
              [
                { key: "beginner" as Difficulty, icon: "leaf-outline", label: "Beginner" },
                { key: "intermediate" as Difficulty, icon: "flash-outline", label: "Intermediate" },
                { key: "advanced" as Difficulty, icon: "rocket-outline", label: "Advanced" },
              ]
            ).map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.8}
                onPress={() => setDifficulty(item.key)}
                style={[
                  styles.difficultyChip,
                  difficulty === item.key && styles.difficultyChipActive,
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={difficulty === item.key ? COLORS.purple : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.difficultyChipText,
                    difficulty === item.key && styles.difficultyChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Practice Style Grid */}
          <Text style={styles.glassLabel}>Practice Style</Text>
          <View style={styles.styleGrid}>
            {(
              [
                {
                  key: "guided_conversation" as ConversationStyle,
                  icon: "compass-outline",
                  label: "Guided",
                  desc: "Step-by-step topic assistance",
                },
                {
                  key: "free_conversation" as ConversationStyle,
                  icon: "mic-outline",
                  label: "Free Talk",
                  desc: "Open-ended natural dialogue",
                },
                {
                  key: "roleplay" as ConversationStyle,
                  icon: "person-outline",
                  label: "Role-play",
                  desc: "Simulated scenario practice",
                },
                {
                  key: "question_answer" as ConversationStyle,
                  icon: "help-circle-outline",
                  label: "Q&A Mode",
                  desc: "Test your comprehension",
                },
              ]
            ).map((item) => {
              const isSelected = conversationStyle === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.8}
                  onPress={() => setConversationStyle(item.key)}
                  style={[
                    styles.styleCard,
                    isSelected && styles.styleCardActive,
                  ]}
                >
                  <View pointerEvents="none" style={styles.glassTopHighlight} />
                  <View
                    style={[
                      styles.styleIconPod,
                      isSelected && styles.styleIconPodActive,
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={isSelected ? COLORS.white : COLORS.purple}
                    />
                  </View>
                  <Text
                    style={[
                      styles.styleCardLabel,
                      isSelected && styles.styleCardLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={styles.styleCardDesc}>{item.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Education Notice */}
          <View style={styles.educationNotice}>
            <View style={styles.educationIconPod}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={COLORS.purple}
              />
            </View>
            <Text style={styles.educationText}>
              Educational only: language learning, vocabulary, grammar, and educational role-play scenarios.
            </Text>
          </View>

          {/* Start CTA Button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <View style={styles.startButtonInner}>
              <Ionicons name="mic" size={20} color={COLORS.white} />
              <Text style={styles.startButtonText}>Start AI Teacher Session</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconPod: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 22,
  },
  headerSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  headerTimerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerTimerText: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: COLORS.purple,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  mascotHero: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  mascotGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(104,71,245,0.12)",
  },
  setupMascot: {
    width: 120,
    height: 120,
  },
  setupTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 23,
    color: COLORS.text,
    textAlign: "center",
    marginTop: 4,
  },
  setupSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: COLORS.text,
  },
  presetsContainer: {
    gap: 10,
    paddingRight: 20,
    marginBottom: 16,
  },
  glassTopHighlight: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: COLORS.glassTopHighlight,
  },
  presetCard: {
    width: 150,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 18,
    padding: 12,
    position: "relative",
    overflow: "hidden",
  },
  presetCardSelected: {
    backgroundColor: COLORS.glassBgSelected,
    borderColor: COLORS.purple,
  },
  presetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  presetIconPod: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(104,71,245,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  presetIconPodSelected: {
    backgroundColor: COLORS.purple,
  },
  presetBadge: {
    backgroundColor: "rgba(104,71,245,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  presetBadgeText: {
    fontFamily: "Poppins-Medium",
    fontSize: 10,
    color: COLORS.purple,
  },
  presetTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 2,
  },
  presetTitleSelected: {
    color: COLORS.purple,
  },
  presetGoalText: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  glassLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  glassInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  glassInputWrapFocused: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.glassBgSelected,
  },
  glassInput: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: COLORS.text,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  difficultyChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingVertical: 10,
    borderRadius: 20,
  },
  difficultyChipActive: {
    backgroundColor: COLORS.glassBgSelected,
    borderColor: COLORS.purple,
  },
  difficultyChipText: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  difficultyChipTextActive: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: COLORS.purple,
  },
  styleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  styleCard: {
    width: "48%",
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 16,
    padding: 12,
    position: "relative",
    overflow: "hidden",
  },
  styleCardActive: {
    backgroundColor: COLORS.glassBgSelected,
    borderColor: COLORS.purple,
  },
  styleIconPod: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(104,71,245,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  styleIconPodActive: {
    backgroundColor: COLORS.purple,
  },
  styleCardLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 2,
  },
  styleCardLabelActive: {
    color: COLORS.purple,
  },
  styleCardDesc: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  educationNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 16,
    padding: 12,
    marginTop: 18,
  },
  educationIconPod: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(104,71,245,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  educationText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  startButton: {
    marginTop: 22,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.purple,
  },
  startButtonInner: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  startButtonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    color: COLORS.white,
  },
});
