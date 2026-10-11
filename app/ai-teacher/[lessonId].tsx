import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { supabase } from "@/services/supabase";
import { startVisionAgentSession, stopVisionAgentSession } from "@/src/api/teacher/agentSessionApi";
import { startTeacherSession } from "@/src/api/teacher/teacherApi";
import { TeacherMode } from "@/src/api/teacher/teacherTypes";
import { LiveTeacherClient } from "@/src/livekit/LiveTeacherClient";
import { TeacherEvent } from "@/src/livekit/livekitTypes";
import { useTeacherStore } from "@/src/store/teacherStore";

const mascotImage = require("@/assets/images/mascot.png");
const DEFAULT_MAX_SECONDS = 300;

type Mode = "connecting" | "call" | "ended" | "error";

/* ============================================================
   COLOR PALETTE (REF: AGENTS.md / LessonStartView / Shop / Profile)
============================================================ */
const COLORS = {
  background: "#F5F2FF",
  purple: "#6847F5",
  purpleDark: "#5135D4",
  purpleLight: "rgba(104,71,245,0.12)",
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
  glassBgHigh: "rgba(104,71,245,0.06)",
  glassBgSelected: "rgba(104,71,245,0.09)",
  glassBorder: "rgba(104,71,245,0.16)",
  glassTopHighlight: "rgba(255,255,255,0.70)",
};

// Current lesson direction: Hindi -> English.
const LESSON_LANGUAGE_OVERRIDE: { source: string; target: string } | null = {
  source: "hi",
  target: "en",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  de: "German",
  fr: "French",
  es: "Spanish",
};

type LessonQuestion = {
  type: string;
  prompt: string;
  instruction: string | null;
  answer: {
    correct_options: {
      text: string;
      correct_order: number | null;
    }[];
    accepted_answers: string[];
    target_text: string | null;
    target_translation: string | null;
  };
};

type LessonDetail = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  icon_url: string | null;
  order_index: number;
  xp_reward: number;
  estimated_minutes: number;
  is_published: boolean;
  metadata: Record<string, unknown>;
  unit: {
    id: number;
    course_id: number;
    title: string;
    description: string | null;
  };
  course: {
    id: number;
    code: string;
    title: string;
    source_language: string;
    target_language: string;
    is_active: boolean;
  };
};

type LessonResponse = {
  success: boolean;
  lesson: LessonDetail;
  question_count: number;
  questions: LessonQuestion[];
  vocabulary?: unknown[] | null;
  phrases?: unknown[] | null;
  topics?: unknown[] | null;
};

// Skia Background component
function SkiaBg({ width, height }: { width: number; height: number }) {
  return (
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
}

export default function AITeacherScreen() {
  const { user } = useApp();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [lessonData, setLessonData] = useState<LessonResponse | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [uiMode, setUiMode] = useState<Mode>("connecting");
  const [endedReason, setEndedReason] = useState<string | null>(null);

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_MAX_SECONDS);
  const [totalPracticedSeconds, setTotalPracticedSeconds] = useState(0);

  // Push-to-Talk (Hold mic to speak) state
  const [isHoldingMic, setIsHoldingMic] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Zustand state
  const {
    session,
    isConnecting,
    isConnected,
    isUserSpeaking,
    isTeacherSpeaking,
    isMicEnabled,
    transcripts = [],
    partialTranscript,
    currentHint,
    currentCorrection,
    error,
    agentStateText,
    setSession,
    setMode: setStoreMode,
    setConnecting,
    setConnected,
    setUserSpeaking,
    setTeacherSpeaking,
    setMicEnabled,
    setAgentStateText,
    addTranscript,
    setPartialTranscript,
    setHint,
    setCorrection,
    setError,
    reset: resetStore,
  } = useTeacherStore();

  const clientRef = useRef<LiveTeacherClient | null>(null);
  const agentSessionRef = useRef<{ callId: string; callType: string; sessionId?: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const partialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const leavingRef = useRef(false);

  // ============================================================
  // LOAD LESSON & START SESSION FLOW
  // ============================================================

  useEffect(() => {
    mountedRef.current = true;
    leavingRef.current = false;
    resetStore();
    setStoreMode("lesson");

    console.log("[AITeacherScreen] Mounted with lessonId:", lessonId);
    loadLesson();

    return () => {
      console.log("[AITeacherScreen] Unmounting. Cleaning up Stream session...");
      mountedRef.current = false;
      cleanup();
    };
  }, [lessonId]);

  async function loadLesson() {
    if (!lessonId) return;

    try {
      setLoadingLesson(true);
      setError(null);
      setEndedReason(null);

      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession?.access_token) {
        throw new Error("User is not authenticated");
      }

      const { data, error: rpcError } = await supabase.rpc("get_lesson_details", {
        p_lesson_id: Number(lessonId),
      });

      if (rpcError) {
        console.error("[AITeacherScreen] get_lesson_details RPC error:", rpcError);
        throw rpcError;
      }

      if (!data?.success || !data?.lesson) {
        throw new Error("Failed to load lesson details");
      }

      if (!mountedRef.current) return;
      console.log("[AITeacherScreen] Lesson loaded successfully:", data.lesson.title);
      setLessonData(data);
      setLoadingLesson(false);

      // Start the live voice session for this lesson
      await startSessionFlow(data);
    } catch (err: any) {
      console.error("[AITeacherScreen] Failed to load lesson:", err);
      if (mountedRef.current) {
        setLoadingLesson(false);
        setUiMode("error");
        setError(err?.message || "Failed to load lesson details");
      }
    }
  }

  // ============================================================
  // SYSTEMATIC TEACHER SESSION FLOW (Lesson Mode)
  // ============================================================

  async function startSessionFlow(data: LessonResponse) {
    try {
      setUiMode("connecting");
      setConnecting(true);
      setError(null);
      setEndedReason(null);
      setAgentStateText("Requesting teacher session from server...");

      const sourceCode =
        LESSON_LANGUAGE_OVERRIDE?.source ??
        data.lesson.course.source_language ??
        "hi";
      const targetCode =
        LESSON_LANGUAGE_OVERRIDE?.target ??
        data.lesson.course.target_language ??
        "en";

      const nativeLanguage =
        LANGUAGE_NAMES[sourceCode.toLowerCase()] ?? sourceCode;
      const targetLanguage =
        LANGUAGE_NAMES[targetCode.toLowerCase()] ?? targetCode;

      const parsedLessonId = Number(lessonId || data.lesson.id);

      const sessionRequest = {
        mode: "lesson" as TeacherMode,
        lesson_id: parsedLessonId,
        lessonId: parsedLessonId,
        native_language: nativeLanguage,
        target_language: targetLanguage,
        level: "A2",
        topic: data.lesson.title,
      };

      console.log("[AITeacherScreen] Calling startTeacherSession with payload:", sessionRequest);

      // Phase 1: API Request to Supabase Edge Function
      const sessionResponse = await startTeacherSession(sessionRequest);
      console.log("[AITeacherScreen] Teacher Session API Response received:", sessionResponse);

      if (!mountedRef.current || leavingRef.current) {
        console.log("[AITeacherScreen] Component unmounted or leaving before Stream connect. Aborting.");
        return;
      }

      setSession(sessionResponse.session);
      const maxSeconds = sessionResponse.session.max_duration_seconds ?? DEFAULT_MAX_SECONDS;
      setSecondsLeft(maxSeconds);

      // Phase 2: Start the Python Vision Agent
      const stream = sessionResponse.stream;

      if (!stream?.call_id || !stream?.call_type || !stream?.user_id) {
        throw new Error(
          "Supabase response is missing Stream call_id, call_type or user_id",
        );
      }

      setAgentStateText("Starting AI Teacher...");

      const agentResult = await startVisionAgentSession({
        callId: stream.call_id,
        callType: stream.call_type,
        userId: stream.user_id,
      });

      agentSessionRef.current = {
        callId: stream.call_id,
        callType: stream.call_type,
        sessionId: agentResult.sessionId,
      };

      if (!mountedRef.current || leavingRef.current) {
        return;
      }

      console.log("[AITeacherScreen] Vision Agent start requested:", {
        callId: stream.call_id,
        sessionId: agentResult.sessionId,
        response: agentResult.raw,
      });

      // Phase 3: Connect the student to the same Stream call
      setAgentStateText("Connecting to AI Teacher room...");

      const fullToken = `${stream.token}|${stream.call_type}/${stream.call_id}`;
      const currentUserId = user?.id || stream.user_id;

      await connectStream(
        stream.api_key,
        fullToken,
        maxSeconds,
        currentUserId,
      );
    } catch (err: any) {
      console.error("[AITeacherScreen] Fatal error in startSessionFlow:", {
        error: err,
        message: err?.message,
        stack: err?.stack,
      });

      if (mountedRef.current && !leavingRef.current) {
        setConnecting(false);
        setError(err?.message || "Failed to start AI Teacher session");
        setUiMode("error");
      }
    }
  }

  // ============================================================
  // STREAM VIDEO CLIENT SETUP & REALTIME HANDLERS
  // ============================================================

  async function connectStream(
    url: string,
    token: string,
    maxSeconds: number,
    userId: string,
  ) {
    console.log("[AITeacherScreen] Initializing LiveTeacherClient (Stream)...");

    const client = new LiveTeacherClient({
      onConnected: () => {
        console.log("[AITeacherScreen] Stream Connected callback triggered!");
        if (!mountedRef.current || leavingRef.current) return;
        setConnecting(false);
        setConnected(true);
        setUiMode("call");
        setAgentStateText("AI Teacher ready");
        startTimer(maxSeconds);
      },

      onDisconnected: (reason) => {
        console.log("[AITeacherScreen] Stream Disconnected callback triggered, reason:", reason);
        if (!mountedRef.current || leavingRef.current) return;
        endCall("Session disconnected.");
      },

      onError: (err) => {
        console.error("[AITeacherScreen] Stream Client Error callback:", err);
        if (!mountedRef.current || leavingRef.current) return;
        setError(err.message);
        setUiMode("error");
      },

      onActiveSpeakersChanged: (speakers: any[]) => {
        if (!mountedRef.current || leavingRef.current) return;

        const isTeacher = speakers.length > 0;

        setTeacherSpeaking(isTeacher);

        if (isTeacher) {
          setAgentStateText("AI Teacher is speaking...");
        } else {
          setAgentStateText("AI Teacher is listening");
        }
      },

      onTrackSubscribed: (track: any, participant: any) => {
        console.log("[AITeacherScreen] Remote Participant joined:", participant?.userId);
        if (mountedRef.current && !leavingRef.current) {
          setAgentStateText("AI Teacher connected");
        }
      },

      onTeacherEvent: (event: TeacherEvent) => {
        if (!mountedRef.current || leavingRef.current) return;
        handleIncomingTeacherEvent(event);
      },
    });

    clientRef.current = client;

    try {
      console.log("[AITeacherScreen] Invoking client.connect()...");
      await client.connect(url, token, userId);
      console.log("[AITeacherScreen] client.connect() promise resolved.");
    } catch (connectErr: any) {
      console.error("[AITeacherScreen] client.connect() rejected:", connectErr);
      throw connectErr;
    }
  }

  async function stopAgentSessionIfNeeded() {
    const active = agentSessionRef.current;
    if (!active) return;

    agentSessionRef.current = null;

    if (!active.sessionId) {
      console.warn("[AITeacherScreen] No agent session ID returned; cannot stop by session ID.");
      return;
    }

    await stopVisionAgentSession({
      callId: active.callId,
      callType: active.callType,
      sessionId: active.sessionId,
    });
  }

  // ============================================================
  // GOODBYE DETECTION & AUTO LEAVE
  // ============================================================

  function checkGoodbye(text: string | null | undefined): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const keywords = [
      "goodbye",
      "good bye",
      "bye bye",
      "see you next time",
      "see you in the next lesson",
      "lesson completed",
      "lesson complete",
      "practice is complete",
      "all questions completed",
      "all questions are completed",
      "have a great day",
      "great job completing",
    ];
    return keywords.some((kw) => lower.includes(kw));
  }

  const scheduleAutoLeave = useCallback(() => {
    if (leaveTimerRef.current) return;
    leaveTimerRef.current = setTimeout(() => {
      endCall("Lesson practice completed successfully.");
    }, 1500);
  }, []);

  // ============================================================
  // REALTIME EVENT PROCESSOR
  // ============================================================

  function handleIncomingTeacherEvent(event: TeacherEvent) {
    console.log("[AITeacherScreen] Handling Teacher Event:", event);
    if (!mountedRef.current || leavingRef.current) return;

    switch (event.type) {
      case "session_started":
        setAgentStateText("AI Teacher is ready");
        break;

      case "user_started_speaking":
        setUserSpeaking(true);
        setAgentStateText("Listening to you...");
        break;

      case "user_stopped_speaking":
        setUserSpeaking(false);
        setAgentStateText("AI Teacher is processing...");
        break;

      case "teacher_started_speaking":
        setTeacherSpeaking(true);
        setAgentStateText("AI Teacher is speaking...");
        break;

      case "teacher_stopped_speaking":
        setTeacherSpeaking(false);
        setAgentStateText("AI Teacher is listening");
        break;

      case "transcript_partial":
        if (event.text) {
          const speaker = event.speaker === "user" ? "user" : "agent";
          setPartialTranscript({
            speaker,
            text: event.text,
          });

          if (speaker === "agent" && checkGoodbye(event.text)) {
            scheduleAutoLeave();
          }

          if (partialTimerRef.current) clearTimeout(partialTimerRef.current);
          partialTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setPartialTranscript(null);
          }, 3500);
        }
        break;

      case "transcript_final":
      case "transcript":
        if (event.text) {
          const speaker = event.speaker === "user" ? "user" : "agent";
          addTranscript(speaker, event.text);
          setPartialTranscript(null);

          if (speaker === "agent" && checkGoodbye(event.text)) {
            scheduleAutoLeave();
          }
        }
        break;

      case "agent_response":
        if ((event as any).text) {
          const text = (event as any).text;
          addTranscript("agent", text);
          setPartialTranscript(null);
          setTeacherSpeaking(true);
          setAgentStateText("AI Teacher is speaking...");

          if (checkGoodbye(text)) {
            scheduleAutoLeave();
          }
        }
        break;

      case "user_transcript":
        if ((event as any).text) {
          addTranscript("user", (event as any).text);
          setPartialTranscript(null);
          setUserSpeaking(false);
          setAgentStateText("AI Teacher is processing...");
        }
        break;

      case "agent_turn_done":
        setTeacherSpeaking(false);
        setAgentStateText("AI Teacher is listening");
        break;

      case "lesson_loaded":
        setAgentStateText("Lesson loaded");
        break;

      case "question_started":
        setAgentStateText("Question started");
        break;

      case "duration_started":
        console.log("[AITeacherScreen] Session duration guard active:", (event as any).max_duration_seconds);
        break;

      case "correction":
        console.log("[AITeacherScreen] Correction Event received:", event);
        setCorrection(event);
        break;

      case "hint":
      case "explanation":
        console.log("[AITeacherScreen] Hint/Explanation Event received:", event);
        if (event.text) {
          setHint(event.text);
        }
        break;

      case "agent_state": {
        const state = (event as any).state as string | undefined;
        console.log("[AITeacherScreen] agent_state:", state);
        if (state === "listening") {
          setTeacherSpeaking(false);
          setAgentStateText("AI Teacher is listening");
        } else if (state === "thinking") {
          setTeacherSpeaking(false);
          setAgentStateText("AI Teacher is thinking...");
        } else if (state === "speaking") {
          setTeacherSpeaking(true);
          setAgentStateText("AI Teacher is speaking...");
        } else if (state === "initializing") {
          setAgentStateText("AI Teacher is joining...");
        }
        break;
      }

      case "user_state": {
        const ustate = (event as any).state as string | undefined;
        console.log("[AITeacherScreen] user_state:", ustate);
        if (ustate === "speaking") {
          setUserSpeaking(true);
          setAgentStateText("Listening to you...");
        } else if (ustate === "stopped") {
          setUserSpeaking(false);
          setAgentStateText("AI Teacher is processing...");
        }
        break;
      }

      case "lesson_completed":
      case "session_timeout":
      case "session_completed":
      case "session_ended":
      case "end_call":
        console.log("[AITeacherScreen] Session End Event received:", event.type);
        endCall("Lesson practice completed successfully.");
        break;

      default:
        console.log("[AITeacherScreen] Unhandled event type:", (event as any)?.type);
        break;
    }
  }

  // ============================================================
  // TIMER LIFECYCLE
  // ============================================================

  function startTimer(initialSeconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);

    console.log(`[AITeacherScreen] Starting session timer: ${initialSeconds}s`);
    setSecondsLeft(initialSeconds);
    const startTime = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, initialSeconds - elapsed);

      if (mountedRef.current) {
        setSecondsLeft(remaining);
        setTotalPracticedSeconds(elapsed);
      }

      if (remaining <= 0) {
        console.log("[AITeacherScreen] Timer expired. Ending session.");
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        endCall("Session time limit reached.");
      }
    }, 500);
  }

  // ============================================================
  // PUSH-TO-TALK CONTROLS
  // ============================================================

  function handlePressInPTT() {
    setIsHoldingMic(true);
    setMicEnabled(true);
    setUserSpeaking(true);
    setAgentStateText("Listening to you...");
    console.log("[AITeacherScreen] PTT ↓ — enabling mic");
    clientRef.current?.setMicrophoneEnabled(true);
  }

  function handlePressOutPTT() {
    setIsHoldingMic(false);
    setMicEnabled(false);
    setUserSpeaking(false);
    setAgentStateText("AI Teacher is thinking...");
    console.log("[AITeacherScreen] PTT ↑ — disabling mic");
    clientRef.current?.setMicrophoneEnabled(false);
  }

  async function toggleSpeaker() {
    const client = clientRef.current;
    if (!client) {
      console.warn("[AITeacherScreen] Cannot toggle speaker: client is null.");
      return;
    }

    try {
      const nextState = !isSpeakerOn;
      console.log(`[AITeacherScreen] Toggling speaker to ${nextState}`);
      await client.setSpeakerphone(nextState);
      setIsSpeakerOn(nextState);
    } catch (e) {
      console.error("[AITeacherScreen] Toggle speaker error:", e);
    }
  }

  // ============================================================
  // END CALL & DISCONNECT
  // ============================================================

  const endCall = useCallback(async (reason?: string) => {
    if (leavingRef.current) return;
    leavingRef.current = true;

    console.log("[AITeacherScreen] Ending call. Reason:", reason);
    if (reason) setEndedReason(reason);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    if (partialTimerRef.current) {
      clearTimeout(partialTimerRef.current);
      partialTimerRef.current = null;
    }

    if (mountedRef.current) {
      setConnected(false);
      setUiMode("ended");
    }

    stopAgentSessionIfNeeded();

    const client = clientRef.current;
    if (client) {
      clientRef.current = null;
      try {
        client.sendControlMessage("end_teacher").catch(() => {});
      } catch (e) {
        console.warn("[AITeacherScreen] Failed to send end control message:", e);
      }

      try {
        await client.disconnect();
      } catch (e) {
        console.warn("[AITeacherScreen] Error during client disconnect:", e);
      }
    }
  }, [setConnected]);

  async function cleanup() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (partialTimerRef.current) {
      clearTimeout(partialTimerRef.current);
      partialTimerRef.current = null;
    }

    stopAgentSessionIfNeeded();

    const client = clientRef.current;
    if (client) {
      try {
        await client.disconnect();
      } catch {}
      clientRef.current = null;
    }
  }

  function formatTime(seconds: number) {
    const s = Math.max(0, isNaN(seconds) ? 0 : seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  // ============================================================
  // 1. ENDED / SESSION SUMMARY STATE
  // ============================================================

  if (uiMode === "ended") {
    return (
      <View style={styles.screen}>
        <SkiaBg width={width} height={height} />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.centerFlexScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.glassModalCard}>
              <View pointerEvents="none" style={styles.glassTopHighlight} />

              <View style={styles.endedMascotWrap}>
                <View style={styles.mascotGlowLarge} />
                <Image
                  source={mascotImage}
                  contentFit="contain"
                  style={styles.endedMascot}
                />
              </View>

              <View style={styles.endedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                <Text style={styles.endedBadgeText}>Completed</Text>
              </View>

              <Text style={styles.modalTitle}>Session Complete</Text>

              <Text style={styles.modalSubtitle}>
                {endedReason ?? "Great job practicing! Your lesson conversation is complete."}
              </Text>

              <View style={styles.statsSummaryRow}>
                <View style={styles.summaryPill}>
                  <Ionicons name="time-outline" size={14} color={COLORS.purple} />
                  <Text style={styles.summaryPillText}>
                    {formatTime(totalPracticedSeconds)} practiced
                  </Text>
                </View>

                <View style={styles.summaryPill}>
                  <Ionicons name="chatbubbles-outline" size={14} color={COLORS.cyan} />
                  <Text style={styles.summaryPillText}>
                    {(transcripts?.length ?? 0)} exchanges
                  </Text>
                </View>

                {lessonData?.lesson?.xp_reward ? (
                  <View style={styles.summaryPill}>
                    <Ionicons name="flash-outline" size={14} color={COLORS.gold} />
                    <Text style={styles.summaryPillText}>
                      +{lessonData.lesson.xp_reward} XP
                    </Text>
                  </View>
                ) : null}
              </View>

              {currentCorrection?.corrected && (
                <View style={styles.correctionReviewCard}>
                  <View style={styles.correctionHeaderRow}>
                    <Ionicons name="sparkles" size={14} color={COLORS.orange} />
                    <Text style={styles.correctionReviewTitle}>Key Grammar Takeaway</Text>
                  </View>
                  {currentCorrection.original ? (
                    <Text style={styles.correctionOriginalText}>
                      "{currentCorrection.original}"
                    </Text>
                  ) : null}
                  <Text style={styles.correctionCorrectedText}>
                    ✓ {currentCorrection.corrected}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={() => router.replace("/(tabs)")}
              >
                <View style={styles.primaryButtonInner}>
                  <Ionicons name="arrow-forward-outline" size={20} color={COLORS.white} />
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryGlassBtn}
                activeOpacity={0.7}
                onPress={() => {
                  leavingRef.current = false;
                  if (lessonData) startSessionFlow(lessonData);
                  else loadLesson();
                }}
              >
                <Text style={styles.secondaryGlassBtnText}>Practice Again</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // 2. LOADING LESSON / PREPARING STATE
  // ============================================================

  if (loadingLesson) {
    return (
      <View style={styles.screen}>
        <SkiaBg width={width} height={height} />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.centerFlexScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.glassModalCard}>
              <View pointerEvents="none" style={styles.glassTopHighlight} />
              <View style={styles.connectingSpinnerWrap}>
                <ActivityIndicator size="large" color={COLORS.purple} />
              </View>
              <Text style={styles.modalTitle}>Preparing AI Teacher...</Text>
              <Text style={styles.modalSubtitle}>
                Loading lesson context and setting up your voice session.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // 3. ERROR STATE
  // ============================================================

  if (!lessonData || uiMode === "error") {
    return (
      <View style={styles.screen}>
        <SkiaBg width={width} height={height} />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.centerFlexScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.glassModalCard}>
              <View pointerEvents="none" style={styles.glassTopHighlight} />

              <View style={styles.errorIconPod}>
                <Ionicons name="warning-outline" size={36} color={COLORS.danger} />
              </View>

              <Text style={styles.modalTitle}>Teacher Unavailable</Text>

              <Text style={styles.modalSubtitle}>
                {error ??
                  "Could not connect to your AI Teacher. Please verify your connection and try again."}
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={() => {
                  leavingRef.current = false;
                  if (lessonData) startSessionFlow(lessonData);
                  else loadLesson();
                }}
              >
                <View style={styles.primaryButtonInner}>
                  <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryGlassBtn}
                activeOpacity={0.7}
                onPress={() => router.replace("/(tabs)")}
              >
                <Text style={styles.secondaryGlassBtnText}>Back to Lessons</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // 4. CONNECTING STATE
  // ============================================================

  if (uiMode === "connecting") {
    return (
      <View style={styles.screen}>
        <SkiaBg width={width} height={height} />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.centerFlexScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.glassModalCard}>
              <View pointerEvents="none" style={styles.glassTopHighlight} />

              <View style={styles.connectingSpinnerWrap}>
                <ActivityIndicator size="large" color={COLORS.purple} />
              </View>

              <Text style={styles.modalTitle}>Your AI Teacher is joining...</Text>

              <Text style={styles.modalSubtitle}>{agentStateText}</Text>

              <View style={styles.topicPreviewPill}>
                <Ionicons name="school-outline" size={14} color={COLORS.purple} />
                <Text style={styles.topicPreviewText} numberOfLines={1}>
                  {lessonData.lesson.title}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // 5. ACTIVE CALL STATE
  // ============================================================

  const recentTranscripts = (transcripts ?? []).slice(-3);

  return (
    <View style={styles.screen}>
      <SkiaBg width={width} height={height} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Call Top Header */}
        <View style={styles.callHeader}>
          <TouchableOpacity
            style={styles.callBackBtn}
            activeOpacity={0.7}
            onPress={() => endCall("You ended the session.")}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.callHeaderCenter}>
            <Text style={styles.callHeaderTitle}>AI Teacher</Text>
            <View style={styles.liveRow}>
              <View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor: isTeacherSpeaking
                      ? COLORS.green
                      : isHoldingMic
                        ? COLORS.cyan
                        : COLORS.purple,
                  },
                ]}
              />
              <Text style={styles.liveText}>{agentStateText}</Text>
            </View>
          </View>

          <View
            style={[
              styles.callTimerPill,
              secondsLeft <= 30 && styles.callTimerPillWarning,
            ]}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={secondsLeft <= 30 ? COLORS.danger : COLORS.purple}
            />
            <Text
              style={[
                styles.callTimerText,
                secondsLeft <= 30 && styles.callTimerTextWarning,
              ]}
            >
              {formatTime(secondsLeft)}
            </Text>
          </View>
        </View>

        {/* Main Interactive Stage */}
        <View style={styles.callArea}>
          <View pointerEvents="none" style={styles.glassTopHighlight} />

          {/* Floating Lesson Header Badge */}
          <View style={styles.sessionBadge}>
            <Ionicons name="book-outline" size={13} color={COLORS.purple} />
            <Text style={styles.sessionBadgeText} numberOfLines={1}>
              {lessonData.lesson.title}
            </Text>
          </View>

          {/* Center Mascot with Voice Reactivity */}
          <View style={styles.mascotCallWrap}>
            {(isTeacherSpeaking || isHoldingMic) && (
              <View
                style={[
                  styles.mascotRippleGlow,
                  isHoldingMic && styles.mascotRippleUser,
                ]}
              />
            )}

            <View
              style={[
                styles.mascotCallGlow,
                isTeacherSpeaking && styles.mascotCallGlowTeacher,
                isHoldingMic && styles.mascotCallGlowUser,
              ]}
            />

            <Image
              source={mascotImage}
              contentFit="contain"
              style={styles.mascotCall}
            />
          </View>

          {/* Hint / Correction Notification Banner */}
          {currentCorrection && (
            <View style={styles.correctionBanner}>
              <View style={styles.correctionBannerIconPod}>
                <Ionicons name="bulb" size={14} color={COLORS.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.correctionBannerTitle}>Grammar Tip</Text>
                <Text style={styles.correctionBannerText}>
                  Say: <Text style={{ fontWeight: "700", color: COLORS.green }}>{currentCorrection.corrected}</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCorrection(null)}
                style={styles.bannerCloseBtn}
              >
                <Ionicons name="close" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {currentHint && !currentCorrection && (
            <View style={styles.hintBanner}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.purple} />
              <Text style={styles.hintBannerText} numberOfLines={2}>
                {currentHint}
              </Text>
              <TouchableOpacity
                onPress={() => setHint(null)}
                style={styles.bannerCloseBtn}
              >
                <Ionicons name="close" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Live Transcripts / Captions Display */}
          <View style={styles.captionsContainer}>
            {recentTranscripts.map((t) => (
              <CaptionBubble
                key={t.id}
                speaker={t.speaker}
                text={t.text}
              />
            ))}

            {partialTranscript && (
              <CaptionBubble
                speaker={partialTranscript.speaker}
                text={partialTranscript.text}
                partial
              />
            )}

            {recentTranscripts.length === 0 && !partialTranscript && (
              <View style={styles.responseBubble}>
                <View style={styles.pulseDot} />
                <View style={styles.responseTextContainer}>
                  <Text style={styles.responsePrimary}>
                    {isTeacherSpeaking
                      ? "AI Teacher is talking..."
                      : isHoldingMic
                        ? "Listening to you..."
                        : "Push & hold mic below to speak"}
                  </Text>
                  <Text style={styles.responseSecondary}>
                    {isHoldingMic
                      ? "Release the button when you finish speaking."
                      : "Hold the mic button while talking to answer."}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Lesson Metadata Glass Row */}
        <View style={styles.feedbackGlassRow}>
          <View pointerEvents="none" style={styles.glassTopHighlight} />
          <FeedbackItem
            icon="school-outline"
            label="Lesson"
            value={lessonData.lesson.title}
            color={COLORS.purple}
          />
          <View style={styles.feedbackDivider} />
          <FeedbackItem
            icon="help-circle-outline"
            label="Questions"
            value={String(lessonData.question_count)}
            color={COLORS.cyan}
          />
          <View style={styles.feedbackDivider} />
          <FeedbackItem
            icon="flash-outline"
            label="XP Reward"
            value={`+${lessonData.lesson.xp_reward}`}
            color={COLORS.gold}
          />
        </View>

        {/* Bottom Call Controls */}
        <View style={styles.callControlsSection}>
          <View style={styles.pttControlsRow}>
            {/* Loudspeaker Toggle Button */}
            <TouchableOpacity
              style={[
                styles.controlRoundBtnSecondary,
                !isSpeakerOn && styles.controlRoundBtnSecondaryMuted,
              ]}
              activeOpacity={0.8}
              onPress={toggleSpeaker}
            >
              <Ionicons
                name={isSpeakerOn ? "volume-high" : "volume-mute"}
                size={22}
                color={isSpeakerOn ? COLORS.purple : COLORS.textMuted}
              />
            </TouchableOpacity>

            {/* Main Push-to-Talk Button */}
            <View style={styles.pttMicWrapper}>
              <Pressable
                onPressIn={handlePressInPTT}
                onPressOut={handlePressOutPTT}
                style={[styles.micOuter, isHoldingMic && styles.micOuterActive]}
              >
                <View
                  style={[
                    styles.micButton,
                    isHoldingMic && styles.micButtonActive,
                  ]}
                >
                  <Ionicons
                    name={isHoldingMic ? "mic" : "mic-outline"}
                    size={34}
                    color={COLORS.white}
                  />
                </View>
              </Pressable>
            </View>

            {/* End Call Button */}
            <TouchableOpacity
              style={styles.controlRoundBtnEnd}
              activeOpacity={0.8}
              onPress={() => endCall("You ended the session.")}
            >
              <Ionicons
                name="call"
                size={22}
                color={COLORS.danger}
                style={{ transform: [{ rotate: "135deg" }] }}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.pushLabel, isHoldingMic && styles.pushLabelActive]}>
            {isHoldingMic ? "Listening..." : "Hold to Speak"}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ============================================================
// CAPTION BUBBLE COMPONENT
// ============================================================

function CaptionBubble({
  speaker,
  text,
  partial = false,
}: {
  speaker: "agent" | "user";
  text: string;
  partial?: boolean;
}) {
  const isTeacher = speaker === "agent";

  return (
    <View
      style={[
        styles.captionBubble,
        isTeacher ? styles.teacherBubble : styles.userBubble,
        partial && styles.partialBubble,
      ]}
    >
      <View style={styles.captionSpeakerRow}>
        <Ionicons
          name={isTeacher ? "school" : "person"}
          size={11}
          color={isTeacher ? COLORS.purple : COLORS.textSecondary}
        />
        <Text
          style={[
            styles.captionSpeaker,
            isTeacher ? styles.teacherSpeaker : styles.userSpeaker,
          ]}
        >
          {isTeacher ? "AI Teacher" : "You"}
        </Text>
      </View>

      <Text
        style={[
          styles.captionText,
          isTeacher ? styles.teacherText : styles.userText,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// ============================================================
// FEEDBACK ITEM COMPONENT
// ============================================================

function FeedbackItem({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.feedbackItem}>
      <View style={[styles.feedbackIconPod, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View style={{ alignItems: "center" }}>
        <Text style={styles.feedbackLabel}>{label}</Text>
        <Text style={styles.feedbackValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// STYLES — STRICT GLASSMORPHISM (ZERO ELEVATION ON GLASS)
// ============================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerFlexScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  glassTopHighlight: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: COLORS.glassTopHighlight,
  },
  callHeader: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassBg,
  },
  callBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  callHeaderCenter: {
    alignItems: "center",
  },
  callHeaderTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: COLORS.text,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  callTimerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  callTimerPillWarning: {
    backgroundColor: "rgba(255,75,75,0.10)",
    borderColor: "rgba(255,75,75,0.25)",
  },
  callTimerText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: COLORS.purple,
  },
  callTimerTextWarning: {
    color: COLORS.danger,
  },
  callArea: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 24,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: "hidden",
    position: "relative",
  },
  sessionBadge: {
    alignSelf: "center",
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.18)",
  },
  sessionBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: COLORS.purple,
    maxWidth: 220,
  },
  mascotCallWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 6,
    marginBottom: 8,
  },
  mascotCall: {
    width: 170,
    height: 170,
    zIndex: 2,
  },
  mascotCallGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(104,71,245,0.12)",
    zIndex: 1,
  },
  mascotCallGlowTeacher: {
    backgroundColor: "rgba(22,197,139,0.22)",
    transform: [{ scale: 1.25 }],
  },
  mascotCallGlowUser: {
    backgroundColor: "rgba(61,205,226,0.24)",
    transform: [{ scale: 1.25 }],
  },
  mascotRippleGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "rgba(22,197,139,0.30)",
    backgroundColor: "rgba(22,197,139,0.06)",
    zIndex: 0,
  },
  mascotRippleUser: {
    borderColor: "rgba(61,205,226,0.35)",
    backgroundColor: "rgba(61,205,226,0.08)",
  },
  correctionBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,150,0,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,150,0,0.30)",
    borderRadius: 14,
    padding: 10,
  },
  correctionBannerIconPod: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,150,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  correctionBannerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 11,
    color: COLORS.orange,
  },
  correctionBannerText: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: COLORS.text,
  },
  hintBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.glassBgHigh,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 14,
    padding: 10,
  },
  hintBannerText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: COLORS.text,
  },
  bannerCloseBtn: {
    padding: 4,
  },
  captionsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  captionBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  teacherBubble: {
    backgroundColor: "rgba(104,71,245,0.08)",
    borderColor: COLORS.purple,
    alignSelf: "flex-start",
    maxWidth: "92%",
  },
  userBubble: {
    backgroundColor: COLORS.glassBgHigh,
    borderColor: COLORS.glassBorder,
    alignSelf: "flex-end",
    maxWidth: "92%",
  },
  partialBubble: {
    opacity: 0.85,
    borderStyle: "dashed",
  },
  captionSpeakerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  captionSpeaker: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 10,
  },
  teacherSpeaker: {
    color: COLORS.purple,
  },
  userSpeaker: {
    color: COLORS.cyan,
  },
  captionText: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  teacherText: {
    color: COLORS.text,
  },
  userText: {
    color: COLORS.text,
  },
  responseBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.glassBgHigh,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 16,
    padding: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.purple,
  },
  responseTextContainer: {
    flex: 1,
  },
  responsePrimary: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: COLORS.text,
  },
  responseSecondary: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  feedbackGlassRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    position: "relative",
  },
  feedbackItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  feedbackIconPod: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackLabel: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: COLORS.textMuted,
  },
  feedbackValue: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: COLORS.text,
    maxWidth: 90,
    textAlign: "center",
  },
  feedbackDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.glassBorder,
  },
  callControlsSection: {
    alignItems: "center",
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  pttControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  pttMicWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  controlRoundBtnSecondary: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.glassBgSelected,
    borderWidth: 1,
    borderColor: COLORS.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  controlRoundBtnSecondaryMuted: {
    backgroundColor: COLORS.glassBg,
    borderColor: COLORS.glassBorder,
  },
  controlRoundBtnEnd: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,75,75,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,75,75,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  micOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(104,71,245,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  micOuterActive: {
    backgroundColor: "rgba(104,71,245,0.25)",
    borderColor: COLORS.purple,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: COLORS.purpleDark,
  },
  pushLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  pushLabelActive: {
    color: COLORS.purple,
    fontFamily: "Poppins-SemiBold",
  },
  glassModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  endedMascotWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  mascotGlowLarge: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(104,71,245,0.14)",
  },
  endedMascot: {
    width: 100,
    height: 100,
  },
  endedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22,197,139,0.10)",
    borderWidth: 1,
    borderColor: "rgba(22,197,139,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 10,
  },
  endedBadgeText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: COLORS.green,
  },
  statsSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.glassBgHigh,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  summaryPillText: {
    fontFamily: "Poppins-Medium",
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  correctionReviewCard: {
    width: "100%",
    backgroundColor: "rgba(255,150,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,150,0,0.25)",
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
  },
  correctionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  correctionReviewTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 11,
    color: COLORS.orange,
  },
  correctionOriginalText: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
  correctionCorrectedText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: COLORS.green,
    marginTop: 2,
  },
  connectingSpinnerWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  errorIconPod: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,75,75,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  topicPreviewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 14,
  },
  topicPreviewText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: COLORS.purple,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 14,
  },
  primaryButton: {
    width: "100%",
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.purple,
    overflow: "hidden",
    marginBottom: 10,
  },
  primaryButtonInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: COLORS.white,
  },
  secondaryGlassBtn: {
    width: "100%",
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryGlassBtnText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: COLORS.textSecondary,
  },
});