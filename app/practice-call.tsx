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
// Note: Participant/Track types are no longer needed from livekit-client.
// Stream SDK manages these internally via LiveTeacherClient.
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

function mapDifficultyToLevel(difficulty?: string): string {
  switch (difficulty?.toLowerCase()) {
    case "beginner":
      return "A2";
    case "intermediate":
      return "B1";
    case "advanced":
      return "B2";
    default:
      return "A2";
  }
}

// Top-level Skia Background component to prevent remounting canvas surfaces
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

export default function PracticeCallScreen() {

  const { user } = useApp()
  const router = useRouter();
  const params = useLocalSearchParams<{
    topic?: string;
    goal?: string;
    difficulty?: string;
    conversationStyle?: string;
  }>();

  const { width, height } = useWindowDimensions();

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

  const [uiMode, setUiMode] = useState<Mode>("connecting");
  const [endedReason, setEndedReason] = useState<string | null>(null);

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_MAX_SECONDS);
  const [totalPracticedSeconds, setTotalPracticedSeconds] = useState(0);

  // Push-to-Talk (Hold mic to speak) state
  const [isHoldingMic, setIsHoldingMic] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const clientRef = useRef<LiveTeacherClient | null>(null);
  const agentSessionRef = useRef<{ callId: string; callType: string; sessionId?: string; } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const partialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const leavingRef = useRef(false);

  const topic = params.topic ?? "";
  const goal = params.goal ?? "";
  const difficulty = params.difficulty ?? "beginner";

  useEffect(() => {
    mountedRef.current = true;
    leavingRef.current = false;
    resetStore();
    setStoreMode("free_teacher");

    console.log("[PracticeCallScreen] Mounted. Initiating AI Teacher session...");
    startSessionFlow();

    return () => {
      console.log("[PracticeCallScreen] Unmounting. Cleaning up Stream session...");
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // ============================================================
  // SYSTEMATIC TEACHER SESSION FLOW (PDF Ref: Sections 5, 8, 12)
  // ============================================================

  async function startSessionFlow() {
    try {
      setUiMode("connecting");
      setConnecting(true);
      setError(null);
      setEndedReason(null);
      setAgentStateText("Requesting teacher session from server...");

      const sessionRequest = {
        mode: "free_teacher" as TeacherMode,
        native_language: "Hindi",
        target_language: "English",
        level: mapDifficultyToLevel(difficulty),
        topic: topic.trim() || (goal.trim() ? `Practice: ${goal.trim()}` : "Daily Conversation Practice"),
        goal: goal.trim() || undefined,
        conversation_style: params.conversationStyle || "guided_conversation",
      };

      console.log("[PracticeCallScreen] Calling startTeacherSession with payload:", sessionRequest);

      // Phase 1: API Request to Supabase Edge Function
      const sessionResponse = await startTeacherSession(sessionRequest);
      console.log("[PracticeCallScreen] Teacher Session API Response received:", sessionResponse);

      if (!mountedRef.current || leavingRef.current) {
        console.log("[PracticeCallScreen] Component unmounted or leaving before Stream connect. Aborting.");
        return;
      }

      setSession(sessionResponse.session);
      const maxSeconds = sessionResponse.session.max_duration_seconds ?? DEFAULT_MAX_SECONDS;
      setSecondsLeft(maxSeconds);


      // Phase 2: Start the Python Vision Agent directly from Expo.
      const stream = sessionResponse.stream;
      const session = sessionResponse.session

      if (!stream?.call_id || !stream?.call_type || !stream?.user_id) {
        throw new Error(
          "Supabase response is missing Stream call_id, call_type or user_id",
        );
      }

      const sessionConfig = {
        session_id: session.id,
        user_id: stream.user_id,
        mode: session.mode,
        native_language: session.native_language,
        target_language: session.target_language,
        level: session.level,
        topic: session.topic,
        plan: session.plan,
        max_duration_seconds: session.max_duration_seconds,
        question_count: session.question_count,
        lesson_id: session.lesson_id,
        quiz_id: session.quiz_id,
        question_id: session.question_id,
        question_index: session.question_index,
      };

      console.log(
        "[PracticeCallScreen] Session config prepared:",
        sessionConfig
      );



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

      console.log("[PracticeCallScreen] Vision Agent start requested:", {
        callId: stream.call_id,
        sessionId: agentResult.sessionId,
        response: agentResult.raw,
      });

      // Phase 3: Connect the student to the same Stream call.
      setAgentStateText("Connecting to AI Teacher room...");

      const fullToken =
        `${stream.token}|${stream.call_type}/${stream.call_id}`;

      const client = await connectStream(
        stream.api_key,
        fullToken,
        session.max_duration_seconds ?? DEFAULT_MAX_SECONDS,
        stream.user_id,
      );


    } catch (err: any) {
      console.error("[PracticeCallScreen] Fatal error in startSessionFlow:", {
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
    console.log("[PracticeCallScreen] Initializing LiveTeacherClient (Stream)...");

    const client = new LiveTeacherClient({
      onConnected: () => {
        console.log("[PracticeCallScreen] Stream Connected callback triggered!");
        if (!mountedRef.current || leavingRef.current) return;
        setConnecting(false);
        setConnected(true);
        setUiMode("call");
        setAgentStateText("AI Teacher ready");
        startTimer(maxSeconds);
      },

      onDisconnected: (reason) => {
        console.log("[PracticeCallScreen] Stream Disconnected callback triggered, reason:", reason);
        if (!mountedRef.current || leavingRef.current) return;
        endCall("Session disconnected.");
      },

      onError: (err) => {
        console.error("[PracticeCallScreen] Stream Client Error callback:", err);
        if (!mountedRef.current || leavingRef.current) return;
        setError(err.message);
        setUiMode("error");
      },

      onActiveSpeakersChanged: (speakers: any[]) => {
        if (!mountedRef.current || leavingRef.current) return;

        // In Stream SDK, speakers are remote participants; treat any non-empty list as teacher speaking
        const isTeacher = speakers.length > 0;

        console.log("[PracticeCallScreen] Active Speakers Update:", {
          isTeacherSpeaking: isTeacher,
          speakersCount: speakers.length,
        });

        setTeacherSpeaking(isTeacher);

        if (isTeacher) {
          setAgentStateText("AI Teacher is speaking...");
        } else {
          setAgentStateText("AI Teacher is listening");
        }
      },

      onTrackSubscribed: (track: any, participant: any) => {
        console.log("[PracticeCallScreen] Remote Participant joined:", {
          participant: participant?.userId,
        });
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
      const userId = user?.id as string;
      console.log("[PracticeCallScreen] Invoking client.connect()...");
      await client.connect(url, token, userId)
      console.log("[PracticeCallScreen] client.connect() promise resolved.");
    } catch (connectErr: any) {
      console.error("[PracticeCallScreen] client.connect() rejected:", connectErr);
      throw connectErr;
    }
  }

  async function stopAgentSessionIfNeeded() {
    const active = agentSessionRef.current;
    if (!active) return;

    // Clear first to avoid duplicate stop requests.
    agentSessionRef.current = null;

    if (!active.sessionId) {
      console.warn(
        "[PracticeCallScreen] No agent session ID returned; cannot stop by session ID.",
      );
      return;
    }

    await stopVisionAgentSession({
      callId: active.callId,
      callType: active.callType,
      sessionId: active.sessionId,
    });
  }

  // ============================================================
  // REALTIME EVENT PROCESSOR (PDF Ref: Section 13 & 14)
  // ============================================================

  function handleIncomingTeacherEvent(event: TeacherEvent) {
    console.log("[PracticeCallScreen] Handling Teacher Event:", event);
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
          setPartialTranscript({
            speaker: event.speaker === "user" ? "user" : "agent",
            text: event.text,
          });

          if (partialTimerRef.current) clearTimeout(partialTimerRef.current);
          partialTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setPartialTranscript(null);
          }, 3500);
        }
        break;

      case "transcript_final":
      case "transcript":
        if (event.text) {
          addTranscript(event.speaker === "user" ? "user" : "agent", event.text);
          setPartialTranscript(null);
        }
        break;

      case "agent_response":
        if ((event as any).text) {
          addTranscript("agent", (event as any).text);
          setPartialTranscript(null);
          setTeacherSpeaking(true);
          setAgentStateText("AI Teacher is speaking...");
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
        console.log("[PracticeCallScreen] Session duration guard active:", (event as any).max_duration_seconds);
        break;

      case "correction":
        console.log("[PracticeCallScreen] Correction Event received:", event);
        setCorrection(event);
        break;

      case "hint":
      case "explanation":
        console.log("[PracticeCallScreen] Hint/Explanation Event received:", event);
        if (event.text) {
          setHint(event.text);
        }
        break;

      // ── Server-driven agent state ──────────────────────────────────────────
      case "agent_state": {
        const state = (event as any).state as string | undefined;
        console.log("[PracticeCallScreen] agent_state:", state);
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

      // ── Server-driven user state ─────────────────────────────────────────
      case "user_state": {
        const ustate = (event as any).state as string | undefined;
        console.log("[PracticeCallScreen] user_state:", ustate);
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
        console.log("[PracticeCallScreen] Session End Event received:", event.type);
        endCall("Session completed successfully.");
        break;

      default:
        console.log("[PracticeCallScreen] Unhandled event type:", (event as any)?.type);
        break;
    }
  }

  // ============================================================
  // TIMER LIFECYCLE
  // ============================================================

  function startTimer(initialSeconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);

    console.log(`[PracticeCallScreen] Starting session timer: ${initialSeconds}s`);
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
        console.log("[PracticeCallScreen] Timer expired. Ending session.");
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        endCall("Session time limit reached.");
      }
    }, 500);
  }

  // ============================================================
  // PUSH-TO-TALK (HOLD TO SPEAK) CONTROLS
  // ============================================================

  function handlePressInPTT() {
    setIsHoldingMic(true);
    setMicEnabled(true);
    setUserSpeaking(true);
    setAgentStateText("Listening to you...");
    console.log("[PracticeCallScreen] PTT ↓ — enabling mic");
    clientRef.current?.setMicrophoneEnabled(true);
  }

  function handlePressOutPTT() {
    setIsHoldingMic(false);
    setMicEnabled(false);
    setUserSpeaking(false);
    setAgentStateText("AI Teacher is thinking...");
    console.log("[PracticeCallScreen] PTT ↑ — disabling mic");
    clientRef.current?.setMicrophoneEnabled(false);
  }

  async function toggleSpeaker() {
    const client = clientRef.current;
    if (!client) {
      console.warn("[PracticeCallScreen] Cannot toggle speaker: client is null.");
      return;
    }

    try {
      const nextState = !isSpeakerOn;
      console.log(`[PracticeCallScreen] Toggling speaker to ${nextState}`);
      await client.setSpeakerphone(nextState);
      setIsSpeakerOn(nextState);
    } catch (e) {
      console.error("[PracticeCallScreen] Toggle speaker error:", e);
    }
  }

  // ============================================================
  // END CALL & DISCONNECT (PDF Ref: Section 15 & 18)
  // ============================================================

  const endCall = useCallback(async (reason?: string) => {
    if (leavingRef.current) return;
    leavingRef.current = true;

    console.log("[PracticeCallScreen] Ending call. Reason:", reason);
    if (reason) setEndedReason(reason);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (partialTimerRef.current) {
      clearTimeout(partialTimerRef.current);
      partialTimerRef.current = null;
    }

    // Immediately display the session complete summary UI
    if (mountedRef.current) {
      setConnected(false);
      setUiMode("ended");
    }

    const client = clientRef.current;
    if (client) {
      clientRef.current = null;
      try {
        client.sendControlMessage("end_teacher").catch(() => { });
      } catch (e) {
        console.warn("[PracticeCallScreen] Failed to send end control message:", e);
      }

      try {
        await client.disconnect();
      } catch (e) {
        console.warn("[PracticeCallScreen] Error during client disconnect:", e);
      }
    }
  }, [setConnected]);

  async function cleanup() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (partialTimerRef.current) {
      clearTimeout(partialTimerRef.current);
      partialTimerRef.current = null;
    }

    const client = clientRef.current;
    if (client) {
      try {
        await client.disconnect();
      } catch { }
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
  // 1. ENDED STATE (Session Summary Screen)
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
                {endedReason ?? "Great job practicing! Your AI Teacher session is done."}
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
                onPress={() => {
                  leavingRef.current = false;
                  startSessionFlow();
                }}
              >
                <View style={styles.primaryButtonInner}>
                  <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                  <Text style={styles.primaryButtonText}>Practice Again</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryGlassBtn}
                activeOpacity={0.7}
                onPress={() => router.back()}
              >
                <Text style={styles.secondaryGlassBtnText}>Back to Practice</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // 2. ERROR STATE (PDF Ref: Section 23)
  // ============================================================

  if (uiMode === "error") {
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
                  startSessionFlow();
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
                onPress={() => router.back()}
              >
                <Text style={styles.secondaryGlassBtnText}>Back to Setup</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // 3. CONNECTING STATE (PDF Ref: Section 21)
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
            <View style={styles.connectingCard}>
              <View pointerEvents="none" style={styles.glassTopHighlight} />

              <View style={styles.connectingSpinnerWrap}>
                <ActivityIndicator size="large" color={COLORS.purple} />
              </View>

              <Text style={styles.connectingTitle}>Your AI Teacher is joining...</Text>

              <Text style={styles.connectingSubtitle}>{agentStateText}</Text>

              <View style={styles.topicPreviewPill}>
                <Ionicons name="school-outline" size={14} color={COLORS.purple} />
                <Text style={styles.topicPreviewText} numberOfLines={1}>
                  {topic || "English Practice"}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // 4. ACTIVE CALL STATE (PDF Ref: Section 18-20)
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

          {/* Floating Topic Header Badge */}
          <View style={styles.sessionBadge}>
            <Ionicons name="school-outline" size={13} color={COLORS.purple} />
            <Text style={styles.sessionBadgeText} numberOfLines={1}>
              {topic || "English Practice"}
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

          {/* Hint / Correction Notification Card */}
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
                      : "Hold the mic button while talking to reduce delays."}
                  </Text>
                </View>
              </View>
            )}
          </View>
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
// STYLES
// ============================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerFlex: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
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
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    position: "relative",
  },
  sessionBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    maxWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.glassBgHigh,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    zIndex: 10,
  },
  sessionBadgeText: {
    fontFamily: "Poppins-Medium",
    fontSize: 11,
    color: COLORS.purple,
  },
  mascotCallWrap: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotRippleGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(104,71,245,0.08)",
  },
  mascotRippleUser: {
    backgroundColor: "rgba(61,205,226,0.10)",
  },
  mascotCallGlow: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(104,71,245,0.12)",
  },
  mascotCallGlowTeacher: {
    backgroundColor: "rgba(104,71,245,0.26)",
    transform: [{ scale: 1.1 }],
  },
  mascotCallGlowUser: {
    backgroundColor: "rgba(61,205,226,0.24)",
    transform: [{ scale: 1.08 }],
  },
  mascotCall: {
    width: 180,
    height: 180,
  },
  correctionBanner: {
    position: "absolute",
    top: 52,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,150,0,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,150,0,0.30)",
    borderRadius: 14,
    padding: 10,
    zIndex: 10,
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
    position: "absolute",
    top: 52,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.glassBgHigh,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 14,
    padding: 10,
    zIndex: 10,
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
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
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
  },
  userBubble: {
    backgroundColor: COLORS.glassBgHigh,
    borderColor: COLORS.glassBorder,
  },
  partialBubble: {
    opacity: 0.85,
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
    color: COLORS.textSecondary,
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
  callControlsSection: {
    alignItems: "center",
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  modalTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    color: COLORS.text,
    textAlign: "center",
  },
  modalSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  statsSummaryRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
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
  primaryButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.purple,
    marginBottom: 8,
  },
  primaryButtonInner: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: COLORS.white,
  },
  secondaryGlassBtn: {
    width: "100%",
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassBg,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryGlassBtnText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    color: COLORS.text,
  },
  errorIconPod: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,75,75,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,75,75,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  connectingCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  connectingSpinnerWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(104,71,245,0.10)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  connectingTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
  },
  connectingSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  topicPreviewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.glassBgHigh,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 14,
  },
  topicPreviewText: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: COLORS.purple,
    maxWidth: 240,
  },
});
