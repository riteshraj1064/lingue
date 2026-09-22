import { Ionicons } from "@expo/vector-icons";
import {
  Call,
  CallClosedCaption,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
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
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/services/supabase";

const mascotImage = require("@/assets/images/mascot.png");

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const AGENT_USER_ID = "ai-teacher";
const MAX_CALL_SECONDS = 120;

type Mode = "connecting" | "call" | "ended" | "error";

type PartialCaption = {
  speaker: "agent" | "user";
  text: string;
};

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
  glassBgHigh: "rgba(104,71,245,0.06)",
  glassBorder: "rgba(104,71,245,0.16)",
  glassTopHighlight: "rgba(255,255,255,0.70)",
};

export default function PracticeCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    topic?: string;
    goal?: string;
    difficulty?: string;
    conversationStyle?: string;
  }>();

  const { width, height } = useWindowDimensions();

  const [mode, setMode] = useState<Mode>("connecting");
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [agentStatus, setAgentStatus] = useState<
    "idle" | "connecting" | "connected" | "failed"
  >("idle");

  const [secondsLeft, setSecondsLeft] = useState(MAX_CALL_SECONDS);
  const [endedReason, setEndedReason] = useState<string | null>(null);

  const callRef = useRef<Call | null>(null);
  const clientRef = useRef<StreamVideoClient | null>(null);
  const agentSessionRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const leavingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topic = params.topic ?? "";
  const goal = params.goal ?? "";
  const difficulty = params.difficulty ?? "beginner";
  const conversationStyle = params.conversationStyle ?? "guided_conversation";

  useEffect(() => {
    mountedRef.current = true;
    startCallSession();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // ============================================================
  // START CALL SESSION
  // ============================================================

  async function startCallSession() {
    try {
      setMode("connecting");
      setAgentStatus("connecting");
      setEndedReason(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("User is not authenticated");
      }

      // Fetch Stream token
      const tokenResponse = await fetch(`${API_URL}/api/stream-token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData?.error ?? "Failed to get Stream token");
      }

      const { token, apiKey, userId } = tokenData;

      // Stream Client instance
      const streamClient = StreamVideoClient.getOrCreateInstance({
        apiKey,
        token,
        user: {
          id: userId,
          name:
            session.user.user_metadata?.full_name ??
            session.user.email ??
            "Student",
        },
      });

      // Unique call ID
      const callId = `ai-ft-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const streamCall = streamClient.call("default", callId);

      await streamCall.join({ create: true });

      // Start with microphone disabled (push-to-talk)
      try {
        await streamCall.microphone.disable();
      } catch (error) {
        console.warn("Could not disable microphone:", error);
      }

      // Stream call custom metadata
      const freeTeacherCustom = {
        mode: "free_teacher",
        source_language: "hi",
        target_language: "en",
        topic: topic.trim() || null,
        goal: goal.trim() || null,
        difficulty,
        conversation_style: conversationStyle,
        max_duration_seconds: MAX_CALL_SECONDS,
      };

      await streamCall.update({
        custom: freeTeacherCustom,
      });

      // Enable closed captions
      try {
        await streamCall.startClosedCaptions();
      } catch (error) {
        console.warn("Closed captions failed:", error);
      }

      callRef.current = streamCall;
      clientRef.current = streamClient;

      if (!mountedRef.current) {
        await streamCall.leave();
        await streamClient.disconnectUser();
        return;
      }

      setClient(streamClient);
      setCall(streamCall);
      setMode("call");

      // Start client timer
      startTwoMinuteTimer();

      // Trigger Python AI Agent
      await startAgentSession(callId, session.access_token);
    } catch (error) {
      console.error("Call start error:", error);
      if (mountedRef.current) {
        setAgentStatus("failed");
        setMode("error");
      }
    }
  }

  // ============================================================
  // TIMER
  // ============================================================

  function startTwoMinuteTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setSecondsLeft(MAX_CALL_SECONDS);
    const startedAt = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, MAX_CALL_SECONDS - elapsed);

      if (mountedRef.current) {
        setSecondsLeft(remaining);
      }

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        endCall("Your 2-minute free teacher session is complete.");
      }
    }, 250);
  }

  // ============================================================
  // AGENT SESSION
  // ============================================================

  async function startAgentSession(callId: string, accessToken: string) {
    try {
      setAgentStatus("connecting");

      const response = await fetch(`${API_URL}/api/agent-session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId,
          callType: "default",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Agent session failed");
      }

      agentSessionRef.current = data.session_id ?? null;

      if (mountedRef.current) {
        setAgentStatus("connected");
      }
    } catch (error) {
      console.error("Free teacher agent error:", error);
      if (mountedRef.current) {
        setAgentStatus("failed");
      }
    }
  }

  // ============================================================
  // END CALL
  // ============================================================

  const endCall = useCallback(async (reason?: string) => {
    if (leavingRef.current) return;
    leavingRef.current = true;

    if (reason) {
      setEndedReason(reason);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await stopAgentSession();

    const activeCall = callRef.current;
    const activeClient = clientRef.current;

    try {
      if (activeCall) await activeCall.leave();
    } catch (error) {
      console.warn("Failed to leave call:", error);
    }

    try {
      if (activeClient) await activeClient.disconnectUser();
    } catch (error) {
      console.warn("Failed to disconnect Stream:", error);
    }

    callRef.current = null;
    clientRef.current = null;
    agentSessionRef.current = null;

    if (mountedRef.current) {
      setClient(null);
      setCall(null);
      setMode("ended");
    }
  }, []);

  // ============================================================
  // STOP AGENT SESSION
  // ============================================================

  async function stopAgentSession() {
    const activeCall = callRef.current;
    const sessionId = agentSessionRef.current;

    if (!activeCall || !sessionId) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      await fetch(
        `${API_URL}/api/agent-session` +
          `?callId=${encodeURIComponent(activeCall.id)}` +
          `&sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
    } catch (error) {
      console.warn("Failed to stop agent:", error);
    }
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  async function cleanup() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const activeCall = callRef.current;
    const activeClient = clientRef.current;

    try {
      await stopAgentSession();
    } catch {}

    try {
      if (activeCall) await activeCall.leave();
    } catch {}

    try {
      if (activeClient) await activeClient.disconnectUser();
    } catch {}

    callRef.current = null;
    clientRef.current = null;
    agentSessionRef.current = null;
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
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

  // ============================================================
  // ENDED STATE
  // ============================================================

  if (mode === "ended") {
    return (
      <View style={styles.screen}>
        <SkiaBg />
        <SafeAreaView style={styles.centerFlex}>
          <View style={styles.endedCard}>
            <View pointerEvents="none" style={styles.glassTopHighlight} />
            <View style={styles.endedMascotWrap}>
              <View style={styles.mascotGlowSmall} />
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

            <Text style={styles.endedTitle}>Session Complete</Text>

            <Text style={styles.endedText}>
              {endedReason ?? "Great work! Your AI Teacher session has ended."}
            </Text>

            <View style={styles.endedTimePill}>
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.endedTimePillText}>Session limit: 2:00</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => router.back()}
            >
              <View style={styles.primaryButtonInner}>
                <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>Start Another Session</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.glassSecondaryBtn}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Text style={styles.glassSecondaryBtnText}>Back to Practice</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================

  if (mode === "error") {
    return (
      <View style={styles.screen}>
        <SkiaBg />
        <SafeAreaView style={styles.centerFlex}>
          <View style={styles.endedCard}>
            <View pointerEvents="none" style={styles.glassTopHighlight} />
            <View style={styles.errorIconPod}>
              <Ionicons name="warning-outline" size={36} color={COLORS.danger} />
            </View>

            <Text style={styles.endedTitle}>Teacher Unavailable</Text>

            <Text style={styles.endedText}>
              We could not start your AI Teacher. Please check your connection and try again.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => {
                leavingRef.current = false;
                startCallSession();
              }}
            >
              <View style={styles.primaryButtonInner}>
                <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.glassSecondaryBtn}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Text style={styles.glassSecondaryBtnText}>Back to Setup</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // CONNECTING STATE
  // ============================================================

  if (mode === "connecting" || !client || !call) {
    return (
      <View style={styles.screen}>
        <SkiaBg />
        <SafeAreaView style={styles.centerFlex}>
          <View style={styles.connectingCard}>
            <View pointerEvents="none" style={styles.glassTopHighlight} />
            <View style={styles.connectingSpinnerWrap}>
              <ActivityIndicator size="large" color={COLORS.purple} />
            </View>

            <Text style={styles.connectingTitle}>
              Your AI Teacher is joining...
            </Text>

            <Text style={styles.connectingSubtitle}>
              Preparing your 2-minute session
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================
  // ACTIVE CALL SCREEN
  // ============================================================

  return (
    <View style={styles.screen}>
      <SkiaBg />
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
                    backgroundColor:
                      agentStatus === "connected" ? COLORS.green : COLORS.purple,
                  },
                ]}
              />
              <Text style={styles.liveText}>
                {agentStatus === "connected"
                  ? "Teacher ready"
                  : "Connecting..."}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.callTimerPill,
              secondsLeft <= 20 && styles.callTimerPillWarning,
            ]}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={secondsLeft <= 20 ? COLORS.danger : COLORS.purple}
            />
            <Text
              style={[
                styles.callTimerText,
                secondsLeft <= 20 && styles.callTimerTextWarning,
              ]}
            >
              {formatTime(secondsLeft)}
            </Text>
          </View>
        </View>

        {/* Video Call Content */}
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <FreeTeacherCallContent
              call={call}
              agentStatus={agentStatus}
              secondsLeft={secondsLeft}
              topicLabel={topic || "English Practice"}
              onLeave={() => endCall("You ended the session.")}
              onRetry={async () => {
                const {
                  data: { session },
                } = await supabase.auth.getSession();

                if (session?.access_token && callRef.current) {
                  await startAgentSession(
                    callRef.current.id,
                    session.access_token
                  );
                }
              }}
            />
          </StreamCall>
        </StreamVideo>
      </SafeAreaView>
    </View>
  );
}

// ============================================================
// INNER CALL CONTENT COMPONENT
// ============================================================

function FreeTeacherCallContent({
  call,
  agentStatus,
  secondsLeft,
  topicLabel,
  onLeave,
  onRetry,
}: {
  call: Call;
  agentStatus: "idle" | "connecting" | "connected" | "failed";
  secondsLeft: number;
  topicLabel: string;
  onLeave: () => void;
  onRetry: () => void;
}) {
  const { useMicrophoneState, useCallClosedCaptions } = useCallStateHooks();
  const { microphone } = useMicrophoneState();
  const captions = useCallClosedCaptions();

  const [isHeld, setIsHeld] = useState(false);
  const [partial, setPartial] = useState<PartialCaption | null>(null);
  const partialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribeCustom = call.on("custom", (event: any) => {
      const data = event?.custom ?? event?.data ?? event ?? {};

      if (
        data.type === "end_call" ||
        data.type === "session_timeout" ||
        event?.type === "end_call"
      ) {
        onLeave();
        return;
      }

      if (data.type === "transcript_partial" && data.text) {
        setPartial({
          speaker: data.speaker ?? "agent",
          text: data.text,
        });

        if (partialTimerRef.current) {
          clearTimeout(partialTimerRef.current);
        }

        partialTimerRef.current = setTimeout(() => {
          setPartial(null);
        }, 3000);
      }
    });

    const unsubscribeEnded = call.on("call.session_ended", () => {
      onLeave();
    });

    return () => {
      unsubscribeCustom();
      unsubscribeEnded();
      if (partialTimerRef.current) {
        clearTimeout(partialTimerRef.current);
      }
    };
  }, [call, onLeave]);

  const isReady = agentStatus === "connected";

  function handlePressIn() {
    if (!isReady) return;
    setIsHeld(true);
    microphone.enable();
  }

  function handlePressOut() {
    setIsHeld(false);
    microphone.disable();
  }

  const recentCaptions = captions.slice(-4);

  return (
    <View style={styles.callContent}>
      {/* Visual Glass Stage */}
      <View style={styles.callArea}>
        <View pointerEvents="none" style={styles.glassTopHighlight} />

        {/* Mascot Center Voice Glow */}
        <View style={styles.mascotCallWrap}>
          <View
            style={[
              styles.mascotCallGlow,
              isReady && styles.mascotCallGlowActive,
            ]}
          />
          <Image
            source={mascotImage}
            contentFit="contain"
            style={styles.mascotCall}
          />
        </View>

        {/* Floating Topic Pill */}
        <View style={styles.sessionBadge}>
          <Ionicons name="school-outline" size={14} color={COLORS.purple} />
          <Text style={styles.sessionBadgeText} numberOfLines={1}>
            {topicLabel}
          </Text>
        </View>

        {/* Floating Timer Badge */}
        <View style={styles.remainingBadge}>
          <Text style={styles.remainingLabel}>Session time</Text>
          <Text style={styles.remainingValue}>
            {formatRemaining(secondsLeft)}
          </Text>
        </View>

        {/* Captions Overlay */}
        <View style={styles.captionsContainer}>
          {recentCaptions.map((caption: CallClosedCaption, index) => {
            const isTeacher = caption.user?.id === AGENT_USER_ID;
            return (
              <CaptionBubble
                key={`${caption.start_time}-${index}`}
                speaker={isTeacher ? "agent" : "user"}
                text={caption.text}
              />
            );
          })}

          {partial && (
            <CaptionBubble
              speaker={partial.speaker}
              text={partial.text}
              partial
            />
          )}

          {recentCaptions.length === 0 && !partial && (
            <View style={styles.responseBubble}>
              {agentStatus === "connecting" && (
                <ActivityIndicator size="small" color={COLORS.purple} />
              )}

              <View style={styles.responseTextContainer}>
                <Text style={styles.responsePrimary}>
                  {agentStatus === "connected"
                    ? "Your AI Teacher is ready!"
                    : "Connecting to your teacher..."}
                </Text>

                <Text style={styles.responseSecondary}>
                  {agentStatus === "connected"
                    ? "Push and hold the mic button to speak."
                    : "Please wait..."}
                </Text>
              </View>

              {agentStatus === "failed" && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onRetry}
                >
                  <Ionicons name="refresh-outline" size={18} color={COLORS.purple} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Push To Talk Controls */}
      <View style={styles.pushToTalkSection}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!isReady}
          style={[styles.micOuter, isHeld && styles.micOuterActive]}
        >
          <View
            style={[
              styles.micButton,
              isHeld && styles.micButtonActive,
              !isReady && styles.micButtonDisabled,
            ]}
          >
            {agentStatus === "connecting" ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons
                name={isHeld ? "mic" : "mic-outline"}
                size={32}
                color={COLORS.white}
              />
            )}
          </View>
        </Pressable>

        <Text style={[styles.pushLabel, isHeld && styles.pushLabelActive]}>
          {isHeld
            ? "Listening..."
            : isReady
            ? "Push & hold to speak"
            : "Waiting for teacher..."}
        </Text>

        <TouchableOpacity
          style={styles.endButton}
          activeOpacity={0.8}
          onPress={onLeave}
        >
          <Ionicons
            name="call"
            size={18}
            color={COLORS.danger}
            style={{ transform: [{ rotate: "135deg" }] }}
          />
          <Text style={styles.endButtonText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================
// CAPTION BUBBLE
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
      <Text
        style={[
          styles.captionSpeaker,
          isTeacher ? styles.teacherSpeaker : styles.userSpeaker,
        ]}
      >
        {isTeacher ? "AI Teacher" : "You"}
      </Text>

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

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
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
  callContent: {
    flex: 1,
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
  mascotCallWrap: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotCallGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(104,71,245,0.10)",
  },
  mascotCallGlowActive: {
    backgroundColor: "rgba(104,71,245,0.22)",
  },
  mascotCall: {
    width: 200,
    height: 200,
  },
  sessionBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    maxWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.glassBgHigh,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  sessionBadgeText: {
    fontFamily: "Poppins-Medium",
    fontSize: 11,
    color: COLORS.purple,
  },
  remainingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.glassBgHigh,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
  },
  remainingLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 9,
    color: COLORS.textMuted,
  },
  remainingValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: COLORS.text,
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
    paddingVertical: 8,
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
    opacity: 0.8,
  },
  captionSpeaker: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 10,
    marginBottom: 2,
  },
  teacherSpeaker: {
    color: COLORS.purple,
  },
  userSpeaker: {
    color: COLORS.textSecondary,
  },
  captionText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 18,
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
    padding: 12,
  },
  responseTextContainer: {
    flex: 1,
  },
  responsePrimary: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: COLORS.text,
  },
  responseSecondary: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  retryButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(104,71,245,0.10)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  pushToTalkSection: {
    alignItems: "center",
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  micButtonDisabled: {
    opacity: 0.5,
  },
  pushLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 16,
  },
  pushLabelActive: {
    color: COLORS.purple,
    fontFamily: "Poppins-SemiBold",
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,75,75,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,75,75,0.25)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  endButtonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: COLORS.danger,
  },
  endedCard: {
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
    marginBottom: 12,
  },
  mascotGlowSmall: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(104,71,245,0.12)",
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
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 12,
  },
  endedBadgeText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: COLORS.green,
  },
  endedTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    color: COLORS.text,
    textAlign: "center",
  },
  endedText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
  endedTimePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.glassBgHigh,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 14,
    marginBottom: 16,
  },
  endedTimePillText: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.purple,
  },
  primaryButtonInner: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    color: COLORS.white,
  },
  glassSecondaryBtn: {
    width: "100%",
    height: 48,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassBg,
    alignItems: "center",
    justifyContent: "center",
  },
  glassSecondaryBtnText: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: COLORS.text,
  },
  errorIconPod: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,75,75,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,75,75,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  connectingCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  connectingSpinnerWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(104,71,245,0.10)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  connectingTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
    color: COLORS.text,
    textAlign: "center",
  },
  connectingSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
});
