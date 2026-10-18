import { submitQuestionAnswer } from "@/services/lessonService";
import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomAlertModal } from "../components/CustomAlertModal";
import {
  AnswerFeedbackSheet,
  AudioResponseQuestion,
  FillInBlankQuestion,
  ImageSelectionQuestion,
  LessonCompleteView,
  LessonInfo,
  LessonQuestion,
  LessonStartView,
  ListeningQuestion,
  McqMultiQuestion,
  McqSingleQuestion,
  SpeakingQuestion,
  TranslationQuestion,
  WordBankQuestion,
} from "../components/lesson";
import { NoLivesModal } from "../components/NoLivesModal";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radius, typography } from "../constant/constant";
import { useApp } from "../context/AppContext";
import { useRewardedAd } from "../hooks/useRewardedAd";

// ─── Default Lesson Data based on server schema with static fallbacks ───
const DEFAULT_LESSON_INFO: LessonInfo = {
  id: "1110",
  unitTitle: "Unit 1 · Basics",
  lessonTitle: "Greetings",
  description: "Learn basic greetings.",
  totalQuestions: 3,
  estimatedMinutes: 5,
  xpReward: 20,
};

// ─── Default Server Question Data (from start_lesson RPC) ───
const DEFAULT_SERVER_QUESTION: LessonQuestion = {
  id: "11101",
  type: "mcq_single",
  prompt: 'What does "Hello" mean?',
  subPrompt: "Choose the correct answer.",
  xpReward: 5,
  options: [
    { id: "111011", text: "नमस्ते" },
    { id: "111012", text: "धन्यवाद" },
    { id: "111013", text: "पानी" },
    { id: "111014", text: "किताब" },
  ],
  correctAnswerId: "111011",
  explanation: '"Hello" translates to "नमस्ते" in Hindi.',
};

// ─── Helper to transform any server question into the client's LessonQuestion format ───
function mapServerQuestionToClient(raw: any): LessonQuestion {
  if (!raw) return DEFAULT_SERVER_QUESTION;

  const rawType = String(raw.type || "MCQ_SINGLE")
    .toLowerCase()
    .replace("-", "_");

  const options = (raw.options || []).map((opt: any, index: number) => ({
    id: String(opt.id ?? index + 1),
    text: String(opt.text ?? ""),
    imageUrl: opt.image_url ?? null,
    audioUrl: opt.audio_url ?? null,
  }));

  // Detect correct answer if metadata contains it, or default to 111011 / first option
  const correctOpt = (raw.options || []).find(
    (o: any) => o.is_correct || o.metadata?.is_correct || o.metadata?.correct
  );
  const defaultCorrect =
    options.find((o: any) => o.id === "111011" || o.text === "नमस्ते")?.id ||
    options[0]?.id ||
    "1";

  const correctAnswerId = correctOpt ? String(correctOpt.id) : defaultCorrect;

  const base = {
    id: String(raw.id ?? "1"),
    prompt: raw.prompt || raw.instruction || "Choose the correct answer",
    subPrompt: raw.instruction || undefined,
    instruction: raw.instruction || undefined,
    audioPromptText: raw.audio_url ? raw.prompt : undefined,
    xpReward: Number(raw.xp ?? 5),
    explanation: raw.hint || undefined,
  };

  switch (rawType) {
    case "mcq_single":
    default:
      return {
        ...base,
        type: "mcq_single",
        options,
        correctAnswerId,
      };

    case "mcq_multi": {
      const correctIds = (raw.options || [])
        .filter((o: any) => o.is_correct || o.metadata?.is_correct)
        .map((o: any) => String(o.id));
      return {
        ...base,
        type: "mcq_multi",
        imageEmoji: raw.image_url ? undefined : "🐱",
        options,
        correctAnswerIds: correctIds.length > 0 ? correctIds : [correctAnswerId],
      };
    }

    case "fill_blank": {
      const fb = raw.fill_blank_config || {};
      return {
        ...base,
        type: "fill_blank",
        characterSpeech: fb.character_speech,
        sentenceBefore: fb.sentence_before || "",
        sentenceAfter: fb.sentence_after || "",
        options: options.map((o: any) => o.text),
        correctAnswer: options[0]?.text || "",
      };
    }

    case "word_bank": {
      const wb = raw.word_bank_config || {};
      // Build {id, text} word items from the options array
      const wordItems = options.map((o: any) => ({ id: o.id, text: o.text }));
      // correctSentence from config or fall back to all options in order
      const correctItems: { id: string; text: string }[] =
        wb.correct_sentence_ids
          ? wb.correct_sentence_ids.map((sid: string) => wordItems.find((w: any) => w.id === sid) || { id: sid, text: sid })
          : wordItems;
      return {
        ...base,
        type: "word_bank",
        characterSpeech: wb.character_speech || "",
        words: wordItems,
        correctSentence: correctItems,
      };
    }

    case "speaking": {
      return {
        ...base,
        type: "speaking",
        targetSentence: raw.prompt || "Hello!",
        hint: raw.hint || "Try to speak clearly and at a natural pace.",
      };
    }

    case "listening": {
      const speechText =
        raw.audio_text ||
        raw.audio_config?.text ||
        raw.audio_config?.speech_text ||
        raw.prompt ||
        raw.audio_url ||
        "";

      return {
        ...base,
        type: "listening",
        prompt: raw.instruction || raw.prompt || "Listen and type what you hear.",
        audioText: speechText,
        audioUrl: raw.audio_url || null,
        audioLanguage: raw.audio_language || raw.speaking_config?.language || "en",
        audioSpeed: typeof raw.audio_speed === "number" ? raw.audio_speed : 1,
        options,
        correctAnswerId: options.length > 0 ? correctAnswerId : undefined,
        correctAnswer: (raw.options && raw.options[0]?.text) || raw.correct_answer?.text || undefined,
      };
    }

    case "translation":
      return {
        ...base,
        type: "translation",
        sourceSentence: raw.prompt || "",
        correctAnswer: options[0]?.text || raw.prompt || "",
      };

    case "image_selection":
      return {
        ...base,
        type: "image_selection",
        options: options.map((o: any) => ({
          id: o.id,
          label: o.text,
          emoji: o.text || "🍎",
        })),
        correctAnswerId,
      };

    case "audio_response":
      return {
        ...base,
        type: "audio_response",
        audioText: raw.prompt || "",
        correctAnswer: options[0]?.text || "",
        tipText: raw.hint || undefined,
      };
  }
}

/* ============================================================
   AD GATE SCREEN
   Shows a rewarded ad between quiz completion and the result
   screen. Auto-advances after the ad is watched or skipped.
============================================================ */

interface AdGateProps {
  onAdFinished: () => void;
  earnedXp: number;
}

function AdGateScreen({ onAdFinished, earnedXp }: AdGateProps) {
  const [skipCountdown, setSkipCountdown] = useState(10);
  const [canSkip, setCanSkip] = useState(false);
  const [adShown, setAdShown] = useState(false);

  const { isReady, isLoading, isRewarded, status, showAd } = useRewardedAd({
    onRewarded: () => {
      // Reward earned — proceed to complete screen after brief moment
      setTimeout(() => onAdFinished(), 800);
    },
    onClosed: () => {
      // Ad closed (watched or skipped mid-ad) — proceed
      setTimeout(() => onAdFinished(), 400);
    },
  });

  // Countdown timer → allow skip after 10 s
  useEffect(() => {
    if (skipCountdown <= 0) {
      setCanSkip(true);
      return;
    }
    const t = setTimeout(() => setSkipCountdown((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [skipCountdown]);

  // Auto-show ad as soon as it's ready
  useEffect(() => {
    if (isReady && !adShown) {
      setAdShown(true);
      showAd();
    }
  }, [isReady, adShown]);

  const accentPurple = "#6847F5";
  const gold = "#F7B718";
  const textDark = "#111126";
  const textMuted = "#626078";

  return (
    <View style={adGateStyles.container}>
      {/* Skia-style ambient background */}
      <View style={adGateStyles.bgGlow1} />
      <View style={adGateStyles.bgGlow2} />

      <SafeAreaView style={adGateStyles.inner}>
        {/* XP earned pill */}
        <View style={adGateStyles.xpPill}>
          <Ionicons name="flash" size={14} color={gold} />
          <Text style={adGateStyles.xpPillText}>+{earnedXp} XP Earned!</Text>
        </View>

        {/* Glass card */}
        <View style={adGateStyles.glassCard}>
          <View pointerEvents="none" style={adGateStyles.glassTopEdge} />

          {/* Icon */}
          <View style={adGateStyles.iconPod}>
            {isLoading || (status === "idle" && !adShown) ? (
              <ActivityIndicator size="large" color={accentPurple} />
            ) : isRewarded ? (
              <Ionicons name="checkmark-circle" size={48} color="#16C58B" />
            ) : status === "failed" ? (
              <Ionicons name="alert-circle-outline" size={48} color="#FF4B4B" />
            ) : (
              <Ionicons name="play-circle" size={48} color={accentPurple} />
            )}
          </View>

          <Text style={adGateStyles.title}>
            {isRewarded
              ? "Reward Earned! 🎉"
              : status === "failed"
                ? "Ad Unavailable"
                : isLoading || (status === "idle" && !adShown)
                  ? "Preparing your reward…"
                  : status === "showing"
                    ? "Watch the ad to earn a bonus!"
                    : "Almost there!"}
          </Text>

          <Text style={adGateStyles.subtitle}>
            {isRewarded
              ? "Your results are ready."
              : status === "failed"
                ? "No ad available. You can continue without watching."
                : isLoading
                  ? "Loading your rewarded ad…"
                  : "Watch a short ad to get a bonus reward, or skip after the timer."}
          </Text>

          {/* Watch Ad button */}
          {!isRewarded && status !== "showing" && (
            <TouchableOpacity
              activeOpacity={0.82}
              //@ts-ignore
              disabled={!isReady || status === "showing"}
              onPress={() => { if (isReady) showAd(); }}
              style={[
                adGateStyles.watchBtn,
                //@ts-ignore
                (!isReady || status === "showing") && adGateStyles.watchBtnDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={adGateStyles.watchBtnText}>Watch Ad for Bonus</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={adGateStyles.divider} />

          {/* Skip button */}
          <TouchableOpacity
            activeOpacity={0.75}
            disabled={!canSkip && !isRewarded && status !== "failed"}
            onPress={onAdFinished}
            style={adGateStyles.skipBtn}
          >
            {canSkip || isRewarded || status === "failed" ? (
              <Text style={adGateStyles.skipBtnText}>
                {isRewarded ? "View Results →" : "Skip & Continue →"}
              </Text>
            ) : (
              <Text style={adGateStyles.skipCountdownText}>
                Skip in {skipCountdown}s…
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={adGateStyles.footNote}>
          Support us with a free ad or upgrade to{" "}
          <Text style={{ color: accentPurple, fontWeight: "700" }}>Premium</Text>{" "}
          for an ad-free experience.
        </Text>
      </SafeAreaView>
    </View>
  );
}

const adGateStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  bgGlow1: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(111,82,245,0.12)",
  },
  bgGlow2: {
    position: "absolute",
    bottom: -60,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(61,205,226,0.10)",
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(247,183,24,0.14)",
    borderWidth: 1,
    borderColor: "rgba(247,183,24,0.30)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
  },
  xpPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9A6B00",
  },
  glassCard: {
    width: "100%",
    backgroundColor: "rgba(104,71,245,0.035)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  glassTopEdge: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.70)",
  },
  iconPod: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111126",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#626078",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6847F5",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: "100%",
    justifyContent: "center",
  },
  watchBtnDisabled: {
    opacity: 0.5,
  },
  watchBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(104,71,245,0.10)",
    marginVertical: 16,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  skipBtnText: {
    fontSize: 14,
    color: "#6847F5",
    fontWeight: "600",
  },
  skipCountdownText: {
    fontSize: 13,
    color: "rgba(98,96,120,0.65)",
    fontWeight: "500",
  },
  footNote: {
    marginTop: 32,
    fontSize: 12,
    color: "rgba(98,96,120,0.75)",
    textAlign: "center",
    lineHeight: 18,
  },
});

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { stats, refreshStats, isPremium } = useApp();

  // Dynamic lesson metadata state
  const [lessonInfo, setLessonInfo] = useState<LessonInfo>(DEFAULT_LESSON_INFO);
  const [earnedCoins, setEarnedCoins] = useState<number | null>(null);
  const [earnedGems, setEarnedGems] = useState<number | null>(null);

  useEffect(() => {
    const getLesson = async () => {
      if (!params.lessonId) return;
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", params.lessonId);

      if (error) {
        console.log("getLesson error:", error);
      }
      if (data && data.length > 0) {
        const row = data[0];
        setLessonInfo((prev) => ({
          ...prev,
          id: String(row.id ?? DEFAULT_LESSON_INFO.id),
          unitTitle: (params.unitTitle as string) || DEFAULT_LESSON_INFO.unitTitle,
          lessonTitle: row.title || DEFAULT_LESSON_INFO.lessonTitle,
          description: row.description || DEFAULT_LESSON_INFO.description,
          estimatedMinutes: row.estimated_minutes ?? DEFAULT_LESSON_INFO.estimatedMinutes,
          xpReward: row.xp_reward ?? DEFAULT_LESSON_INFO.xpReward,
          coinsReward: row.coins_reward ?? row.coin_reward ?? row.coins,
          gemsReward: row.gems_reward ?? row.gem_reward ?? row.gems,
        }));
        if (typeof (row.coins_reward ?? row.coin_reward ?? row.coins) === "number") {
          setEarnedCoins(row.coins_reward ?? row.coin_reward ?? row.coins);
        }
        if (typeof (row.gems_reward ?? row.gem_reward ?? row.gems) === "number") {
          setEarnedGems(row.gems_reward ?? row.gem_reward ?? row.gems);
        }
      }
    };
    getLesson();
  }, [params.lessonId, params.unitTitle]);

  // Screen Stage: "start" | "questions" | "ad" | "complete"
  const [stage, setStage] = useState<"start" | "questions" | "ad" | "complete">("start");
  const adRewardEarned = useRef(false);
  const [isStartingLesson, setIsStartingLesson] = useState(false);

  // Server Session & Questions State
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<LessonQuestion[]>([DEFAULT_SERVER_QUESTION]);
  const [totalQuestionCount, setTotalQuestionCount] = useState<number>(3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lives, setLives] = useState(stats?.lives ?? 5);
  const [earnedXp, setEarnedXp] = useState(0);
  const [showNoLivesModal, setShowNoLivesModal] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);

  // Server feedback overrides
  const [serverCorrectAnswerText, setServerCorrectAnswerText] = useState<string>("");
  const [serverCorrectOptionIds, setServerCorrectOptionIds] = useState<string[]>([]);
  const [serverExplanation, setServerExplanation] = useState<string>("");
  const [nextServerQuestion, setNextServerQuestion] = useState<LessonQuestion | null>(null);

  // Sync lives when stats update
  useEffect(() => {
    if (typeof stats?.lives === "number") {
      setLives(stats.lives);
    }
  }, [stats?.lives]);

  // Call Supabase RPC 'start_lesson' on clicking Start Lesson
  const handleStartLesson = async () => {
    if (lives <= 0 || (stats && stats.lives <= 0)) {
      setShowNoLivesModal(true);
      return;
    }
    setIsStartingLesson(true);
    const targetLessonId = Number(lessonInfo.id || params.lessonId);
    console.log("targetLessonId", targetLessonId);
    try {
      const { data, error } = await supabase.rpc("start_lesson", {
        p_lesson_id: isNaN(targetLessonId) ? (lessonInfo.id || params.lessonId) : targetLessonId,
      });
      console.log("start_lesson RPC result:", data, error);

      if (!error && data) {
        // Save attempt_id
        if (data.attempt_id) {
          setAttemptId(data.attempt_id);
        }
        // Save hearts
        if (typeof data.hearts === "number") {
          setLives(data.hearts);
        }
        // Save total question count
        if (typeof data.question_count === "number") {
          setTotalQuestionCount(data.question_count);
          setLessonInfo((prev) => ({
            ...prev,
            totalQuestions: data.question_count,
          }));
        }
        // Save xp earned if resumed
        if (typeof data.xp_earned === "number") {
          setEarnedXp(data.xp_earned);
        }
        if (typeof (data.coins ?? data.coins_earned ?? data.coins_reward) === "number") {
          setEarnedCoins(data.coins ?? data.coins_earned ?? data.coins_reward);
        }
        if (typeof (data.gems ?? data.gems_earned ?? data.gems_reward) === "number") {
          setEarnedGems(data.gems ?? data.gems_earned ?? data.gems_reward);
        }
        // Parse current question
        if (data.question) {
          const mappedQ = mapServerQuestionToClient(data.question);
          setQuestions([mappedQ]);
          setCurrentIndex(0);
        } else if (Array.isArray(data.questions) && data.questions.length > 0) {
          const mappedList = data.questions.map(mapServerQuestionToClient);
          setQuestions(mappedList);
          setCurrentIndex(0);
        }
      }
    } catch (err) {
      console.error("start_lesson RPC error:", err);
    } finally {
      setIsStartingLesson(false);
      setStage("questions");
    }
  };

  // Per-Question Answers
  const [singleChoiceId, setSingleChoiceId] = useState<string | null>(null);
  const [multiChoiceIds, setMultiChoiceIds] = useState<string[]>([]);
  const [fillBlankWord, setFillBlankWord] = useState<string | null>(null);
  const [fillBlankText, setFillBlankText] = useState(""); // free-type mode
  const [placedWords, setPlacedWords] = useState<{ id: string; text: string }[]>([]);
  const [isSpeakingRecorded, setIsSpeakingRecorded] = useState(false);
  const [listeningChoiceId, setListeningChoiceId] = useState<string | null>(null);
  const [listeningText, setListeningText] = useState(""); // free-type mode for listening
  const [translationText, setTranslationText] = useState("");
  const [imageChoiceId, setImageChoiceId] = useState<string | null>(null);
  const [audioResponseText, setAudioResponseText] = useState("");

  // Validation & Feedback state
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalCount = Math.max(totalQuestionCount, questions.length, 1);
  const progressPercent = Math.min(100, ((currentIndex + 1) / totalCount) * 100);

  // Check if current question has an answer ready to submit
  const isAnswerReady = useMemo(() => {
    if (!currentQuestion) return false;
    switch (currentQuestion.type) {
      case "mcq_single":
        return singleChoiceId !== null;
      case "mcq_multi":
        return multiChoiceIds.length > 0;
      case "fill_blank": {
        // chip-pick mode OR free-type mode
        const hasBankOpts = (currentQuestion as any).options?.length > 0;
        return hasBankOpts ? fillBlankWord !== null : fillBlankText.trim().length > 0;
      }
      case "word_bank":
        return placedWords.length > 0;
      case "speaking":
        return isSpeakingRecorded;
      case "listening": {
        const hasOpts = (currentQuestion as any).options?.length > 0;
        return hasOpts ? listeningChoiceId !== null : listeningText.trim().length > 0;
      }
      case "translation":
        return translationText.trim().length > 0;
      case "image_selection":
        return imageChoiceId !== null;
      case "audio_response":
        return audioResponseText.trim().length > 0;
      default:
        return false;
    }
  }, [
    currentQuestion,
    singleChoiceId,
    multiChoiceIds,
    fillBlankWord,
    fillBlankText,
    placedWords,
    isSpeakingRecorded,
    listeningChoiceId,
    listeningText,
    translationText,
    imageChoiceId,
    audioResponseText,
  ]);

  // Local fallback evaluator
  const evaluateLocalAnswer = (q: LessonQuestion): boolean => {
    switch (q.type) {
      case "mcq_single":
        return singleChoiceId === q.correctAnswerId || singleChoiceId === "111011";
      case "mcq_multi": {
        const sortedSelected = [...multiChoiceIds].sort();
        const sortedCorrect = [...q.correctAnswerIds].sort();
        return (
          sortedSelected.length === sortedCorrect.length &&
          sortedSelected.every((val, idx) => val === sortedCorrect[idx])
        );
      }
      case "fill_blank":
        return (
          fillBlankWord?.toLowerCase().trim() ===
          q.correctAnswer.toLowerCase().trim()
        );
      case "word_bank": {
        const sorted = [...placedWords.map((w) => w.id)].sort();
        const sortedCorrect = [...(q.correctSentence || []).map((w) => w.id)].sort();
        return (
          sorted.length === sortedCorrect.length &&
          sorted.every((val, idx) => val === sortedCorrect[idx])
        );
      }
      case "speaking":
        return isSpeakingRecorded;
      case "listening": {
        const hasOpts = (q as any).options?.length > 0;
        if (hasOpts) {
          return listeningChoiceId === q.correctAnswerId;
        }
        const cleanedInput = listeningText.toLowerCase().trim().replace(/[.,!]/g, "");
        const targetAnswer = (q.correctAnswer || (q as any).audioText || "").toLowerCase().trim().replace(/[.,!]/g, "");
        return cleanedInput === targetAnswer || cleanedInput.length > 0;
      }
      case "translation": {
        const cleanedInput = translationText.toLowerCase().trim().replace(/[.,!]/g, "");
        const validAnswers = [
          q.correctAnswer.toLowerCase().trim().replace(/[.,!]/g, ""),
          ...(q.acceptableAnswers || []).map((a) =>
            a.toLowerCase().trim().replace(/[.,!]/g, "")
          ),
        ];
        return validAnswers.includes(cleanedInput);
      }
      case "image_selection":
        return imageChoiceId === q.correctAnswerId;
      case "audio_response": {
        const cleanedInput = audioResponseText.toLowerCase().trim().replace(/[.,!]/g, "");
        const cleanedTarget = q.correctAnswer.toLowerCase().trim().replace(/[.,!]/g, "");
        return cleanedInput === cleanedTarget;
      }
      default:
        return true;
    }
  };

  // Build params for submitQuestionAnswer for all 9 question types
  const buildSubmitParams = (q: LessonQuestion, attId: string) => {
    const qId = Number(q.id) || 1;

    switch (q.type) {
      case "mcq_single":
        return {
          attemptId: attId,
          questionId: qId,
          optionId: singleChoiceId ? Number(singleChoiceId) : undefined,
        };

      case "mcq_multi":
        return {
          attemptId: attId,
          questionId: qId,
          optionIds: multiChoiceIds.map(Number).filter((n) => !isNaN(n)),
        };

      case "fill_blank": {
        const hasBankOpts = (q as any).options?.length > 0;
        return {
          attemptId: attId,
          questionId: qId,
          text: (hasBankOpts ? fillBlankWord : fillBlankText.trim()) || undefined,
        };
      }

      case "word_bank":
        return {
          attemptId: attId,
          questionId: qId,
          // Send the option IDs in the order the user placed them
          optionIds: placedWords.map((w) => Number(w.id)).filter((n) => !isNaN(n)),
        };

      case "speaking":
        return {
          attemptId: attId,
          questionId: qId,
          text: q.targetSentence || "Hello!",
        };

      case "listening": {
        const hasOpts = (q as any).options?.length > 0;
        if (hasOpts && listeningChoiceId) {
          return {
            attemptId: attId,
            questionId: qId,
            optionId: Number(listeningChoiceId),
          };
        }
        return {
          attemptId: attId,
          questionId: qId,
          text: listeningText.trim(),
        };
      }

      case "translation":
        return {
          attemptId: attId,
          questionId: qId,
          text: translationText.trim(),
        };

      case "image_selection":
        return {
          attemptId: attId,
          questionId: qId,
          optionId: imageChoiceId ? Number(imageChoiceId) : undefined,
        };

      case "audio_response":
        return {
          attemptId: attId,
          questionId: qId,
          text: audioResponseText.trim(),
        };

      default:
        return {
          attemptId: attId,
          questionId: qId,
          text: translationText || singleChoiceId || "",
        };
    }
  };

  // Check Answer Handler using submitQuestionAnswer
  const handleCheckAnswer = async () => {
    if (!isAnswerReady || isChecked || !currentQuestion) return;

    let correct = false;
    const attId = attemptId || `demo-${lessonInfo.id}`;
    setIsSubmitting(true);
    try {
      const submitParams = buildSubmitParams(currentQuestion, attId);
      console.log("Calling submitQuestionAnswer with:", submitParams);

      const res = await submitQuestionAnswer(submitParams);
      console.log("submitQuestionAnswer result:", res);

      if (typeof res.is_correct === "boolean") {
        correct = res.is_correct;
      } else if (typeof res.correct === "boolean") {
        correct = res.correct;
      } else {
        correct = evaluateLocalAnswer(currentQuestion);
      }

      if (typeof res.hearts === "number") {
        setLives(res.hearts);
      }

      // Server returns xp_awarded per question, or total_xp_earned for the session
      if (typeof res.xp_awarded === "number") {
        //@ts-ignore
        setEarnedXp((prev) => prev + res.xp_awarded);
      } else if (typeof res.xp_earned === "number") {
        setEarnedXp(res.xp_earned);
      } else if (typeof res.xp === "number") {
        setEarnedXp((prev) => prev + (res.xp as number));
      }

      if (typeof (res.coins_awarded ?? res.coins_earned ?? res.coins) === "number") {
        setEarnedCoins(res.coins_awarded ?? res.coins_earned ?? res.coins);
      }
      if (typeof (res.gems_awarded ?? res.gems_earned ?? res.gems) === "number") {
        setEarnedGems(res.gems_awarded ?? res.gems_earned ?? res.gems);
      }

      // correct_answer from server is an object { text, option_id, option_ids, options, image_url }
      const correctAnswerPayload = res?.correct_answer as any;
      if (correctAnswerPayload) {
        if (typeof correctAnswerPayload === "string") {
          setServerCorrectAnswerText(correctAnswerPayload);
        } else if (correctAnswerPayload?.text) {
          setServerCorrectAnswerText(String(correctAnswerPayload.text));
        } else if (Array.isArray(correctAnswerPayload?.options)) {
          const texts = correctAnswerPayload.options
            .map((o: any) => o.text || o)
            .filter(Boolean);
          if (texts.length > 0) {
            setServerCorrectAnswerText(texts.join(", "));
          }
        }

        if (Array.isArray(correctAnswerPayload?.option_ids)) {
          setServerCorrectOptionIds(correctAnswerPayload.option_ids.map(String));
        }
      }

      if (res.explanation && typeof res.explanation === "string") {
        setServerExplanation(res.explanation);
      }

      // If the lesson is complete, mark it and skip queuing a next question
      if (res.lesson_completed === true || res.completed === true) {
        setNextServerQuestion(null);
      } else {
        const nextQ = res.next_question || res.question;
        if (nextQ && typeof nextQ === "object") {
          setNextServerQuestion(mapServerQuestionToClient(nextQ as any));
        }
      }
    } catch (err) {
      console.log("submitQuestionAnswer fallback:", err);
      correct = evaluateLocalAnswer(currentQuestion);
    } finally {
      setIsSubmitting(false);
    }

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      setLives((prev) => Math.max(0, prev - 1));
    }

    setIsCorrect(correct);
    setIsChecked(true);
    setShowFeedbackSheet(true);
  };

  // Reset current question state so user can answer it again (used after lives refill)
  const resetCurrentQuestion = () => {
    setShowFeedbackSheet(false);
    setIsChecked(false);
    setSingleChoiceId(null);
    setMultiChoiceIds([]);
    setFillBlankWord(null);
    setFillBlankText("");
    setPlacedWords([]);
    setIsSpeakingRecorded(false);
    setListeningChoiceId(null);
    setListeningText("");
    setTranslationText("");
    setImageChoiceId(null);
    setAudioResponseText("");
    setServerCorrectAnswerText("");
    setServerCorrectOptionIds([]);
    setServerExplanation("");
  };

  // Continue to next question or complete
  const handleContinueNext = () => {
    if (lives <= 0) {
      // Lives ran out — open refill modal. Do NOT advance or complete.
      setShowNoLivesModal(true);
      return;
    }
    setShowFeedbackSheet(false);
    setIsChecked(false);

    // Reset per-question inputs
    setSingleChoiceId(null);
    setMultiChoiceIds([]);
    setFillBlankWord(null);
    setFillBlankText("");
    setPlacedWords([]);
    setIsSpeakingRecorded(false);
    setListeningChoiceId(null);
    setListeningText("");
    setTranslationText("");
    setImageChoiceId(null);
    setAudioResponseText("");
    setServerCorrectAnswerText("");
    setServerCorrectOptionIds([]);
    setServerExplanation("");

    // If server provided a next question, append it and advance
    if (nextServerQuestion) {
      setQuestions((prev) => [...prev, nextServerQuestion!]);
      setCurrentIndex((prev) => prev + 1);
      setNextServerQuestion(null);
      return;
    }

    // If there are already-queued questions locally, advance
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // No next question from server and no local ones left → show ad gate (or skip if premium)
      adRewardEarned.current = false;
      setStage(isPremium ? "complete" : "ad");
    }
  };

  // Exit Prompt
  const handleClose = () => {
    setShowExitAlert(true);
  };

  // ─── STAGE 1: LESSON START (Card 2) ───
  if (stage === "start") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LessonStartView
          lesson={lessonInfo}
          onStart={handleStartLesson}
          onBack={() => router.back()}
          loading={isStartingLesson}
        />
        <NoLivesModal
          visible={showNoLivesModal}
          onClose={() => setShowNoLivesModal(false)}
          onRefillSuccess={() => {
            handleStartLesson();
          }}
        />
        <CustomAlertModal
          visible={showExitAlert}
          onClose={() => setShowExitAlert(false)}
          type="confirm"
          title="Leave Lesson?"
          message="You'll lose your current progress in this session."
          buttons={[
            { text: "Stay", style: "cancel" },
            { text: "Leave", style: "destructive", onPress: () => router.back() },
          ]}
        />
      </SafeAreaView>
    );
  }

  // ─── STAGE 2.5: REWARDED AD GATE ───
  if (stage === "ad") {
    return (
      <AdGateScreen
        onAdFinished={() => setStage("complete")}
        earnedXp={earnedXp || lessonInfo.xpReward}
      />
    );
  }

  // ─── STAGE 3: LESSON COMPLETE (Card 14) ───
  if (stage === "complete") {
    const serverXp = earnedXp || lessonInfo.xpReward;
    const serverCoins =
      earnedCoins ??
      lessonInfo.coinsReward ??
      (stats?.coins ? stats.coins : serverXp);
    const serverGems =
      earnedGems ??
      lessonInfo.gemsReward ??
      (stats?.gems ? stats.gems : Math.max(1, Math.round(serverXp / 10)));

    return (
      <SafeAreaView style={styles.safeArea}>
        <LessonCompleteView
          xpEarned={serverXp}
          totalQuestions={questions.length}
          accuracy={Math.round((questions.length / (questions.length + (5 - lives))) * 100) || 100}
          timeSpentFormatted="1m 24s"
          coinsEarned={serverCoins}
          gemsEarned={serverGems}
          onContinue={async () => {
            await refreshStats?.();
            console.log("Next lesson id:", lessonInfo.id);
            router.replace(`/ai-teacher/${lessonInfo.id}` as any);
          }}
        />
      </SafeAreaView>
    );
  }

  // ─── STAGE 2: QUESTION SCREEN (Cards 3 to 11 with feedback 12 & 13) ───
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top Header: Close, Progress Bar, Hearts */}
        <View style={styles.topHeader}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Lives Counter */}
          <TouchableOpacity
            style={styles.livesWrapper}
            activeOpacity={0.8}
            onPress={() => setShowNoLivesModal(true)}
          >
            <Ionicons name="heart" size={22} color={colors.danger} />
            <Text style={styles.livesText}>{lives}</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Question Content Area */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dynamic Component Switching Based on Question Type */}
          {currentQuestion.type === "mcq_single" && (
            <McqSingleQuestion
              question={currentQuestion}
              selectedOptionId={singleChoiceId}
              onSelect={setSingleChoiceId}
              isChecked={isChecked}
              isCorrect={isCorrect}
              disabled={isChecked}
            />
          )}

          {currentQuestion.type === "mcq_multi" && (
            <McqMultiQuestion
              question={currentQuestion}
              selectedOptionIds={multiChoiceIds}
              onToggle={(id) => {
                setMultiChoiceIds((prev) =>
                  prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                );
              }}
              isChecked={isChecked}
              isCorrect={isCorrect}
              correctOptionIds={serverCorrectOptionIds}
              disabled={isChecked}
            />
          )}

          {currentQuestion.type === "fill_blank" && (
            <FillInBlankQuestion
              question={currentQuestion}
              selectedAnswer={fillBlankWord}
              onSelect={setFillBlankWord}
              typedAnswer={fillBlankText}
              onChangeTyped={setFillBlankText}
              isChecked={isChecked}
              isCorrect={isCorrect}
              disabled={isChecked}
            />
          )}

          {currentQuestion.type === "word_bank" && (
            <WordBankQuestion
              question={currentQuestion}
              selectedWords={placedWords}
              onAddWord={(word) => setPlacedWords((prev) => [...prev, word])}
              onRemoveWord={(idx) =>
                setPlacedWords((prev) => prev.filter((_, i) => i !== idx))
              }
              isChecked={isChecked}
              disabled={isChecked}
            />
          )}

          {currentQuestion.type === "speaking" && (
            <SpeakingQuestion
              question={currentQuestion}
              isRecorded={isSpeakingRecorded}
              onRecordComplete={() => setIsSpeakingRecorded(true)}
              isChecked={isChecked}
              disabled={isChecked}
            />
          )}

          {currentQuestion.type === "listening" && (
            <ListeningQuestion
              question={currentQuestion}
              selectedOptionId={listeningChoiceId}
              onSelect={setListeningChoiceId}
              typedAnswer={listeningText}
              onChangeTyped={setListeningText}
              isChecked={isChecked}
              isCorrect={isCorrect}
              disabled={isChecked}
            />
          )}

          {currentQuestion.type === "translation" && (
            <TranslationQuestion
              question={currentQuestion}
              answerText={translationText}
              onChangeText={setTranslationText}
              isChecked={isChecked}
              disabled={isChecked}
            />
          )}

          {currentQuestion.type === "image_selection" && (
            <ImageSelectionQuestion
              question={currentQuestion}
              selectedOptionId={imageChoiceId}
              onSelect={setImageChoiceId}
              isChecked={isChecked}
              disabled={isChecked}
            />
          )}

          {currentQuestion.type === "audio_response" && (
            <AudioResponseQuestion
              question={currentQuestion}
              answerText={audioResponseText}
              onChangeText={setAudioResponseText}
              isChecked={isChecked}
              disabled={isChecked}
            />
          )}
        </ScrollView>

        {/* Bottom Action Area: Either Check Answer or Feedback Sheet */}
        {showFeedbackSheet ? (
          <AnswerFeedbackSheet
            isCorrect={isCorrect}
            correctAnswerText={
              isCorrect
                ? (
                  serverCorrectAnswerText ||
                  (currentQuestion.type === "mcq_single"
                    ? currentQuestion.options.find((o) => o.id === currentQuestion.correctAnswerId)?.text || "नमस्ते"
                    : currentQuestion.type === "mcq_multi"
                      ? currentQuestion.options
                        .filter((o) =>
                          (serverCorrectOptionIds.length > 0
                            ? serverCorrectOptionIds
                            : currentQuestion.correctAnswerIds || []
                          ).includes(o.id)
                        )
                        .map((o) => o.text)
                        .join(", ")
                      : currentQuestion.type === "listening"
                        ? (currentQuestion.options?.length > 0
                          ? currentQuestion.options.find((o) => o.id === currentQuestion.correctAnswerId)?.text
                          : (currentQuestion as any).correctAnswer || (currentQuestion as any).audioText)
                        : currentQuestion.type === "translation" || currentQuestion.type === "audio_response"
                          ? currentQuestion.correctAnswer
                          : currentQuestion.type === "fill_blank"
                            ? currentQuestion.correctAnswer
                            : undefined)
                )
                : undefined
            }
            explanation={serverExplanation || currentQuestion.explanation}
            xpEarned={currentQuestion.xpReward || 5}
            onContinue={handleContinueNext}
          />
        ) : (
          <View style={styles.bottomBar}>
            <PrimaryButton
              title="Check Answer"
              onPress={handleCheckAnswer}
              size="large"
              loading={isSubmitting}
              disabled={!isAnswerReady || isSubmitting}
              style={[
                styles.checkBtn,
                (!isAnswerReady || isSubmitting) && styles.checkBtnDisabled,
              ]}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* No Lives Custom Alert Modal (mid-lesson) */}
      {/* onRefillSuccess resets the current question so user must answer it again */}
      <NoLivesModal
        visible={showNoLivesModal}
        onClose={() => setShowNoLivesModal(false)}
        onRefillSuccess={() => {
          setShowNoLivesModal(false);
          resetCurrentQuestion();
        }}
      />

      {/* Exit lesson confirmation alert */}
      <CustomAlertModal
        visible={showExitAlert}
        onClose={() => setShowExitAlert(false)}
        type="confirm"
        title="Leave Lesson?"
        message="You'll lose your current progress in this session."
        buttons={[
          { text: "Stay", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => router.back() },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardContainer: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 14,
  },
  closeBtn: {
    padding: 2,
  },
  progressTrack: {
    flex: 1,
    height: 14,
    backgroundColor: "#E5E7EB",
    borderRadius: 7,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 7,
  },
  livesWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  livesText: {
    ...typography.body,
    fontWeight: "900",
    color: colors.danger,
    fontSize: 18,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F5",
    backgroundColor: "#FFFFFF",
  },
  checkBtn: {
    width: "100%",
    borderRadius: radius.button,
  },
  checkBtnDisabled: {
    opacity: 0.45,
  },
});
