import { Ionicons } from "@expo/vector-icons";
import {
  Call,
  CallClosedCaption,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors as themeColors } from "@/constant/constant";
import { supabase } from "@/services/supabase";

const mascotImage = require("@/assets/images/mascot.png");

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const AGENT_USER_ID = "ai-teacher";

const MAX_CALL_SECONDS = 120;

type Mode = "setup" | "connecting" | "call" | "ended" | "error";

type Difficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

type ConversationStyle =
  | "guided_conversation"
  | "free_conversation"
  | "roleplay"
  | "question_answer";

type PartialCaption = {
  speaker: "agent" | "user";
  text: string;
};

const colors = {
  ...themeColors,
  primary: {
    purple: themeColors.primary,
  },
  text: themeColors.textPrimary,
  secondary: themeColors.textSecondary,
  border: themeColors.border,
  surface: themeColors.inputBackground,
  success: themeColors.success,
  danger: themeColors.danger,
};

export default function FreeTeacherScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("setup");

  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");

  const [difficulty, setDifficulty] =
    useState<Difficulty>("beginner");

  const [conversationStyle, setConversationStyle] =
    useState<ConversationStyle>("guided_conversation");

  const [client, setClient] =
    useState<StreamVideoClient | null>(null);

  const [call, setCall] =
    useState<Call | null>(null);

  const [agentStatus, setAgentStatus] = useState<
    "idle" | "connecting" | "connected" | "failed"
  >("idle");

  const [secondsLeft, setSecondsLeft] =
    useState(MAX_CALL_SECONDS);

  const [endedReason, setEndedReason] =
    useState<string | null>(null);

  const callRef =
    useRef<Call | null>(null);

  const clientRef =
    useRef<StreamVideoClient | null>(null);

  const agentSessionRef =
    useRef<string | null>(null);

  const mountedRef =
    useRef(true);

  const leavingRef =
    useRef(false);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // ============================================================
  // START FREE TEACHER
  // ============================================================

  async function startFreeTeacher() {
    if (mode !== "setup") return;

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

      // ----------------------------------------------------
      // STREAM TOKEN
      // ----------------------------------------------------

      const tokenResponse = await fetch(
        `${API_URL}/api/stream-token`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      const tokenData =
        await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(
          tokenData?.error ??
          "Failed to get Stream token"
        );
      }

      const {
        token,
        apiKey,
        userId,
      } = tokenData;

      // ----------------------------------------------------
      // STREAM CLIENT
      // ----------------------------------------------------

      const streamClient =
        StreamVideoClient.getOrCreateInstance({
          apiKey,
          token,
          user: {
            id: userId,
            name:
              session.user.user_metadata
                ?.full_name ??
              session.user.email ??
              "Student",
          },
        });

      // ----------------------------------------------------
      // UNIQUE FREE TEACHER CALL
      // ----------------------------------------------------

      const callId = `ai-ft-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const streamCall =
        streamClient.call(
          "default",
          callId
        );

      await streamCall.join({
        create: true,
      });

      // ----------------------------------------------------
      // START WITH MICROPHONE OFF
      // ----------------------------------------------------

      try {
        await streamCall.microphone.disable();
      } catch (error) {
        console.warn(
          "Could not disable microphone:",
          error
        );
      }

      // ----------------------------------------------------
      // FREE TEACHER CUSTOM DATA
      // ----------------------------------------------------

      const freeTeacherCustom = {
        mode: "free_teacher",

        source_language: "hi",
        target_language: "en",

        topic:
          topic.trim() || null,

        goal:
          goal.trim() || null,

        difficulty,

        conversation_style:
          conversationStyle,

        max_duration_seconds:
          MAX_CALL_SECONDS,
      };

      console.log(
        "FREE TEACHER PAYLOAD",
        freeTeacherCustom
      );

      await streamCall.update({
        custom: freeTeacherCustom,
      });

      // ----------------------------------------------------
      // CLOSED CAPTIONS
      // ----------------------------------------------------

      try {
        await streamCall.startClosedCaptions();
      } catch (error) {
        console.warn(
          "Closed captions failed:",
          error
        );
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

      // ----------------------------------------------------
      // START 2 MINUTE CLIENT TIMER
      //
      // This is UX protection.
      // The Python agent ALSO has a server-side timer.
      // ----------------------------------------------------

      startTwoMinuteTimer();

      // ----------------------------------------------------
      // START PYTHON AGENT
      // ----------------------------------------------------

      await startAgentSession(
        callId,
        session.access_token
      );

    } catch (error) {
      console.error(
        "Free teacher start error:",
        error
      );

      if (mountedRef.current) {
        setAgentStatus("failed");
        setMode("error");
      }
    }
  }

  // ============================================================
  // TWO MINUTE TIMER
  // ============================================================

  function startTwoMinuteTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setSecondsLeft(MAX_CALL_SECONDS);

    const startedAt = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - startedAt) / 1000
      );

      const remaining =
        Math.max(
          0,
          MAX_CALL_SECONDS - elapsed
        );

      if (mountedRef.current) {
        setSecondsLeft(remaining);
      }

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(
            timerRef.current
          );
          timerRef.current = null;
        }

        endCall(
          "Your 2-minute free teacher session is complete."
        );
      }
    }, 250);
  }

  // ============================================================
  // AGENT SESSION
  // ============================================================

  async function startAgentSession(
    callId: string,
    accessToken: string
  ) {
    try {
      setAgentStatus("connecting");

      const response =
        await fetch(
          `${API_URL}/api/agent-session`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              callId,
              callType: "default",
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
          "Agent session failed"
        );
      }

      agentSessionRef.current =
        data.session_id ?? null;

      if (mountedRef.current) {
        setAgentStatus("connected");
      }

    } catch (error) {
      console.error(
        "Free teacher agent error:",
        error
      );

      if (mountedRef.current) {
        setAgentStatus("failed");
      }
    }
  }

  // ============================================================
  // END CALL
  // ============================================================

  const endCall = useCallback(
    async (reason?: string) => {
      if (leavingRef.current) {
        return;
      }

      leavingRef.current = true;

      if (reason) {
        setEndedReason(reason);
      }

      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );
        timerRef.current = null;
      }

      await stopAgentSession();

      const activeCall =
        callRef.current;

      const activeClient =
        clientRef.current;

      try {
        if (activeCall) {
          await activeCall.leave();
        }
      } catch (error) {
        console.warn(
          "Failed to leave call:",
          error
        );
      }

      try {
        if (activeClient) {
          await activeClient.disconnectUser();
        }
      } catch (error) {
        console.warn(
          "Failed to disconnect Stream:",
          error
        );
      }

      callRef.current = null;
      clientRef.current = null;
      agentSessionRef.current = null;

      if (mountedRef.current) {
        setClient(null);
        setCall(null);
        setMode("ended");
      }
    },
    []
  );

  // ============================================================
  // STOP AGENT
  // ============================================================

  async function stopAgentSession() {
    const activeCall =
      callRef.current;

    const sessionId =
      agentSessionRef.current;

    if (!activeCall || !sessionId) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      await fetch(
        `${API_URL}/api/agent-session` +
        `?callId=${encodeURIComponent(
          activeCall.id
        )}` +
        `&sessionId=${encodeURIComponent(
          sessionId
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

    } catch (error) {
      console.warn(
        "Failed to stop agent:",
        error
      );
    }
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  async function cleanup() {
    if (timerRef.current) {
      clearInterval(
        timerRef.current
      );
      timerRef.current = null;
    }

    const activeCall =
      callRef.current;

    const activeClient =
      clientRef.current;

    try {
      await stopAgentSession();
    } catch { }

    try {
      if (activeCall) {
        await activeCall.leave();
      }
    } catch { }

    try {
      if (activeClient) {
        await activeClient.disconnectUser();
      }
    } catch { }

    callRef.current = null;
    clientRef.current = null;
    agentSessionRef.current = null;
  }

  // ============================================================
  // FORMAT TIMER
  // ============================================================

  function formatTime(seconds: number) {
    const minutes =
      Math.floor(seconds / 60);

    const secs =
      seconds % 60;

    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  // ============================================================
  // SETUP UI
  // ============================================================

  if (mode === "setup") {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>

          <Text
            style={styles.headerTitle}
          >
            AI Teacher
          </Text>

          <View style={styles.headerTimer}>
            <Ionicons
              name="time-outline"
              size={17}
              color={colors.primary.purple}
            />

            <Text
              style={styles.headerTimerText}
            >
              2:00
            </Text>
          </View>
        </View>

        <View style={styles.setupContainer}>
          <Image
            source={mascotImage}
            contentFit="contain"
            style={styles.setupMascot}
          />

          <Text style={styles.title}>
            What do you want to learn?
          </Text>

          <Text style={styles.subtitle}>
            Choose a topic or goal and your AI
            Teacher will practice with you.
          </Text>

          <Text style={styles.label}>
            Topic
          </Text>

          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="e.g. Travel, cricket, daily life"
            placeholderTextColor="#999"
            style={styles.input}
          />

          <Text style={styles.label}>
            Learning goal
          </Text>

          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder="e.g. Speak confidently"
            placeholderTextColor="#999"
            style={styles.input}
          />

          <Text style={styles.label}>
            Difficulty
          </Text>

          <View style={styles.optionRow}>
            {(
              [
                "beginner",
                "intermediate",
                "advanced",
              ] as Difficulty[]
            ).map((item) => (
              <ChoiceButton
                key={item}
                label={
                  item[0].toUpperCase() +
                  item.slice(1)
                }
                active={
                  difficulty === item
                }
                onPress={() =>
                  setDifficulty(item)
                }
              />
            ))}
          </View>

          <Text style={styles.label}>
            Practice style
          </Text>

          <View style={styles.optionWrap}>
            <ChoiceButton
              label="Guided"
              active={
                conversationStyle ===
                "guided_conversation"
              }
              onPress={() =>
                setConversationStyle(
                  "guided_conversation"
                )
              }
            />

            <ChoiceButton
              label="Free Talk"
              active={
                conversationStyle ===
                "free_conversation"
              }
              onPress={() =>
                setConversationStyle(
                  "free_conversation"
                )
              }
            />

            <ChoiceButton
              label="Role-play"
              active={
                conversationStyle ===
                "roleplay"
              }
              onPress={() =>
                setConversationStyle(
                  "roleplay"
                )
              }
            />

            <ChoiceButton
              label="Q&A"
              active={
                conversationStyle ===
                "question_answer"
              }
              onPress={() =>
                setConversationStyle(
                  "question_answer"
                )
              }
            />
          </View>

          <View style={styles.educationNotice}>
            <Ionicons
              name="school-outline"
              size={20}
              color={colors.primary.purple}
            />

            <Text
              style={styles.educationText}
            >
              Education only: language learning,
              conversation, grammar, vocabulary and
              educational role-play.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={startFreeTeacher}
          >
            <Ionicons
              name="mic-outline"
              size={22}
              color="#FFFFFF"
            />

            <Text
              style={styles.startButtonText}
            >
              Start AI Teacher
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // ENDED
  // ============================================================

  if (mode === "ended") {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.endedContainer}>
          <Image
            source={mascotImage}
            contentFit="contain"
            style={styles.endedMascot}
          />

          <Text style={styles.endedTitle}>
            Session complete
          </Text>

          <Text
            style={styles.endedText}
          >
            {endedReason ??
              "Great work! Your AI Teacher session has ended."}
          </Text>

          <Text
            style={styles.timeUsed}
          >
            Session limit: 2:00
          </Text>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              leavingRef.current = false;
              setEndedReason(null);
              setSecondsLeft(
                MAX_CALL_SECONDS
              );
              setAgentStatus("idle");
              setMode("setup");
            }}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color="#FFFFFF"
            />

            <Text
              style={styles.startButtonText}
            >
              Start Another Session
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.secondaryButtonText}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (mode === "error") {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Ionicons
            name="warning-outline"
            size={50}
            color={colors.danger}
          />

          <Text
            style={styles.errorTitle}
          >
            Teacher unavailable
          </Text>

          <Text
            style={styles.endedText}
          >
            We could not start your AI Teacher.
          </Text>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              leavingRef.current = false;
              setAgentStatus("idle");
              setMode("setup");
            }}
          >
            <Text
              style={styles.startButtonText}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // CONNECTING / ACTIVE CALL
  // ============================================================

  if (!client || !call) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={colors.primary.purple}
          />

          <Text style={styles.loadingTitle}>
            Your AI Teacher is joining...
          </Text>

          <Text style={styles.endedText}>
            Preparing your 2-minute session
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            endCall("You ended the session.")
          }
        >
          <Ionicons
            name="chevron-back"
            size={25}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            AI Teacher
          </Text>

          <View style={styles.liveRow}>
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    agentStatus ===
                      "connected"
                      ? colors.success
                      : colors.primary.purple,
                },
              ]}
            />

            <Text
              style={styles.liveText}
            >
              {agentStatus ===
                "connected"
                ? "Teacher ready"
                : "Connecting..."}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.timerPill,
            secondsLeft <= 20 &&
            styles.timerPillWarning,
          ]}
        >
          <Ionicons
            name="time-outline"
            size={17}
            color={
              secondsLeft <= 20
                ? colors.danger
                : colors.primary.purple
            }
          />

          <Text
            style={[
              styles.timerText,
              secondsLeft <= 20 &&
              styles.timerTextWarning,
            ]}
          >
            {formatTime(secondsLeft)}
          </Text>
        </View>
      </View>

      <StreamVideo client={client}>
        <StreamCall call={call}>
          <FreeTeacherCallContent
            call={call}
            agentStatus={agentStatus}
            secondsLeft={secondsLeft}
            onLeave={() =>
              endCall(
                "You ended the session."
              )
            }
            onRetry={async () => {
              const {
                data: {
                  session,
                },
              } =
                await supabase.auth.getSession();

              if (
                session?.access_token &&
                callRef.current
              ) {
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
  );
}


// ============================================================
// CALL CONTENT
// ============================================================

function FreeTeacherCallContent({
  call,
  agentStatus,
  secondsLeft,
  onLeave,
  onRetry,
}: {
  call: Call;
  agentStatus:
  | "idle"
  | "connecting"
  | "connected"
  | "failed";
  secondsLeft: number;
  onLeave: () => void;
  onRetry: () => void;
}) {
  const {
    useMicrophoneState,
    useCallClosedCaptions,
  } = useCallStateHooks();

  const { microphone } =
    useMicrophoneState();

  const captions =
    useCallClosedCaptions();

  const [isHeld, setIsHeld] =
    useState(false);

  const [partial, setPartial] =
    useState<PartialCaption | null>(null);

  const partialTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  // ------------------------------------------------------------
  // CALL EVENTS
  // ------------------------------------------------------------

  useEffect(() => {
    const unsubscribeCustom =
      call.on(
        "custom",
        (event: any) => {
          const data =
            event?.custom ??
            event?.data ??
            event ??
            {};

          if (
            data.type === "end_call" ||
            data.type === "session_timeout" ||
            event?.type === "end_call"
          ) {
            onLeave();
            return;
          }

          if (
            data.type ===
            "transcript_partial" &&
            data.text
          ) {
            setPartial({
              speaker:
                data.speaker ??
                "agent",
              text: data.text,
            });

            if (
              partialTimerRef.current
            ) {
              clearTimeout(
                partialTimerRef.current
              );
            }

            partialTimerRef.current =
              setTimeout(() => {
                setPartial(null);
              }, 3000);
          }
        }
      );

    const unsubscribeEnded =
      call.on(
        "call.session_ended",
        () => {
          onLeave();
        }
      );

    return () => {
      unsubscribeCustom();
      unsubscribeEnded();

      if (
        partialTimerRef.current
      ) {
        clearTimeout(
          partialTimerRef.current
        );
      }
    };
  }, [call, onLeave]);

  // ------------------------------------------------------------
  // PUSH TO TALK
  // ------------------------------------------------------------

  const isReady =
    agentStatus === "connected";

  function handlePressIn() {
    if (!isReady) return;

    setIsHeld(true);

    microphone.enable();
  }

  function handlePressOut() {
    setIsHeld(false);

    microphone.disable();
  }

  // ------------------------------------------------------------
  // CAPTIONS
  // ------------------------------------------------------------

  const recentCaptions =
    captions.slice(-4);

  return (
    <View style={styles.callContent}>
      <View style={styles.callArea}>
        <Image
          source={mascotImage}
          contentFit="contain"
          style={styles.mascot}
        />

        <View
          style={
            styles.sessionBadge
          }
        >
          <Ionicons
            name="school-outline"
            size={15}
            color={
              colors.primary.purple
            }
          />

          <Text
            style={
              styles.sessionBadgeText
            }
          >
            English Practice
          </Text>
        </View>

        <View
          style={styles.captionsContainer}
        >
          {recentCaptions.map(
            (
              caption: CallClosedCaption,
              index
            ) => {
              const isTeacher =
                caption.user
                  ?.id ===
                AGENT_USER_ID;

              return (
                <CaptionBubble
                  key={`${caption.start_time}-${index}`}
                  speaker={
                    isTeacher
                      ? "agent"
                      : "user"
                  }
                  text={
                    caption.text
                  }
                />
              );
            }
          )}

          {partial && (
            <CaptionBubble
              speaker={
                partial.speaker
              }
              text={partial.text}
              partial
            />
          )}

          {recentCaptions.length === 0 &&
            !partial && (
              <View
                style={
                  styles.responseBubble
                }
              >
                {agentStatus ===
                  "connecting" && (
                    <ActivityIndicator
                      size="small"
                      color={
                        colors.primary
                          .purple
                      }
                    />
                  )}

                <View
                  style={
                    styles.responseTextContainer
                  }
                >
                  <Text
                    style={
                      styles.responsePrimary
                    }
                  >
                    {agentStatus ===
                      "connected"
                      ? "Your AI Teacher is ready!"
                      : "Connecting to your teacher..."}
                  </Text>

                  <Text
                    style={
                      styles.responseSecondary
                    }
                  >
                    {agentStatus ===
                      "connected"
                      ? "Hold the mic and start speaking."
                      : "Please wait..."}
                  </Text>
                </View>

                {agentStatus ===
                  "failed" && (
                    <TouchableOpacity
                      style={
                        styles.retryButton
                      }
                      onPress={
                        onRetry
                      }
                    >
                      <Ionicons
                        name="refresh-outline"
                        size={20}
                        color={
                          colors.primary
                            .purple
                        }
                      />
                    </TouchableOpacity>
                  )}
              </View>
            )}
        </View>

        <View
          style={styles.remainingBadge}
        >
          <Text
            style={
              styles.remainingLabel
            }
          >
            Session time
          </Text>

          <Text
            style={
              styles.remainingValue
            }
          >
            {formatRemaining(
              secondsLeft
            )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.pushToTalkSection
        }
      >
        <Pressable
          onPressIn={
            handlePressIn
          }
          onPressOut={
            handlePressOut
          }
          disabled={!isReady}
          style={[
            styles.micOuter,
            isHeld &&
            styles.micOuterActive,
          ]}
        >
          <View
            style={[
              styles.micButton,
              isHeld &&
              styles.micButtonActive,
              !isReady &&
              styles.micButtonDisabled,
            ]}
          >
            {agentStatus ===
              "connecting" ? (
              <ActivityIndicator
                size="small"
                color={
                  colors.primary
                    .purple
                }
              />
            ) : (
              <Ionicons
                name={
                  isHeld
                    ? "mic"
                    : "mic-outline"
                }
                size={36}
                color={
                  isHeld
                    ? "#FFFFFF"
                    : colors.text
                }
              />
            )}
          </View>
        </Pressable>

        <Text
          style={[
            styles.pushLabel,
            isHeld &&
            styles.pushLabelActive,
          ]}
        >
          {isHeld
            ? "Listening..."
            : isReady
              ? "Push & hold to speak"
              : "Waiting for teacher..."}
        </Text>

        <TouchableOpacity
          style={
            styles.endButton
          }
          onPress={onLeave}
        >
          <Ionicons
            name="call"
            size={20}
            color="#FFFFFF"
            style={{
              transform: [
                {
                  rotate: "135deg",
                },
              ],
            }}
          />

          <Text
            style={
              styles.endButtonText
            }
          >
            End
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


// ============================================================
// CHOICE BUTTON
// ============================================================

function ChoiceButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.choiceButton,
        active &&
        styles.choiceButtonActive,
      ]}
    >
      <Text
        style={[
          styles.choiceText,
          active &&
          styles.choiceTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}


// ============================================================
// CAPTION
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
  const isTeacher =
    speaker === "agent";

  return (
    <View
      style={[
        styles.captionBubble,
        isTeacher
          ? styles.teacherBubble
          : styles.userBubble,
        partial &&
        styles.partialBubble,
      ]}
    >
      <Text
        style={[
          styles.captionSpeaker,
          isTeacher
            ? styles.teacherSpeaker
            : styles.userSpeaker,
        ]}
      >
        {isTeacher
          ? "AI Teacher"
          : "You"}
      </Text>

      <Text
        style={[
          styles.captionText,
          isTeacher
            ? styles.teacherText
            : styles.userText,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}


function formatRemaining(
  seconds: number
) {
  const minutes =
    Math.floor(seconds / 60);

  const secs =
    seconds % 60;

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  header: {
    height: 68,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FFFFFF",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    color: colors.text,
  },

  headerTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  headerTimerText: {
    fontFamily: "Poppins-SemiBold",
    color: colors.primary.purple,
    fontSize: 14,
  },

  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
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
    color: colors.secondary,
  },

  timerPill: {
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F3F0FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  timerPillWarning: {
    backgroundColor: "#FFF0F0",
  },

  timerText: {
    fontFamily: "Poppins-SemiBold",
    color: colors.primary.purple,
    fontSize: 14,
  },

  timerTextWarning: {
    color: colors.danger,
  },

  setupContainer: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 14,
  },

  setupMascot: {
    height: 115,
    width: "100%",
    marginBottom: 4,
  },

  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 25,
    color: colors.text,
    marginTop: 5,
  },

  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondary,
    marginTop: 5,
    marginBottom: 15,
  },

  label: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: colors.text,
    marginBottom: 7,
    marginTop: 5,
  },

  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 14,
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: colors.text,
    marginBottom: 7,
  },

  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 7,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  choiceButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },

  choiceButtonActive: {
    borderColor: colors.primary.purple,
    backgroundColor: "#F1EDFF",
  },

  choiceText: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: colors.secondary,
  },

  choiceTextActive: {
    color: colors.primary.purple,
  },

  educationNotice: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 11,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
  },

  educationText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    lineHeight: 17,
    color: colors.secondary,
  },

  startButton: {
    height: 52,
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: colors.primary.purple,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  startButtonText: {
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    fontSize: 15,
  },

  secondaryButton: {
    height: 48,
    marginTop: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontFamily: "Poppins-Medium",
    color: colors.text,
    fontSize: 14,
  },

  endedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },

  endedMascot: {
    width: 220,
    height: 190,
    marginBottom: 10,
  },

  endedTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 25,
    color: colors.text,
  },

  endedText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: colors.secondary,
    marginTop: 8,
  },

  timeUsed: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    color: colors.primary.purple,
    marginTop: 12,
  },

  loadingTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
    color: colors.text,
    marginTop: 15,
  },

  errorTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 21,
    color: colors.text,
    marginTop: 12,
  },

  callContent: {
    flex: 1,
  },

  callArea: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#F4F2FF",
    position: "relative",
  },

  mascot: {
    position: "absolute",
    top: 20,
    bottom: 20,
    left: -25,
    right: -25,
  },

  sessionBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  sessionBadgeText: {
    fontFamily: "Poppins-Medium",
    fontSize: 11,
    color: colors.primary.purple,
  },

  captionsContainer: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 15,
    gap: 7,
  },

  captionBubble: {
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  teacherBubble: {
    backgroundColor: colors.primary.purple,
  },

  userBubble: {
    backgroundColor: "#FFFFFF",
  },

  partialBubble: {
    opacity: 0.86,
  },

  captionSpeaker: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 10,
    marginBottom: 2,
  },

  teacherSpeaker: {
    color: "rgba(255,255,255,0.7)",
  },

  userSpeaker: {
    color: colors.secondary,
  },

  captionText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 18,
  },

  teacherText: {
    color: "#FFFFFF",
  },

  userText: {
    color: colors.text,
  },

  responseBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  responseTextContainer: {
    flex: 1,
    marginLeft: 10,
  },

  responsePrimary: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: colors.text,
  },

  responseSecondary: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },

  retryButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  remainingBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
  },

  remainingLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 9,
    color: colors.secondary,
  },

  remainingValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: colors.primary.purple,
  },

  pushToTalkSection: {
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 18,
  },

  micOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  micOuterActive: {
    borderWidth: 3,
    borderColor: "#C4B5FD",
    backgroundColor: "#F5F3FF",
  },

  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  micButtonActive: {
    backgroundColor: colors.primary.purple,
  },

  micButtonDisabled: {
    opacity: 0.5,
  },

  pushLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    color: colors.secondary,
    marginTop: 4,
  },

  pushLabelActive: {
    color: colors.primary.purple,
  },

  endButton: {
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 21,
    marginTop: 13,
    backgroundColor: colors.danger,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  endButtonText: {
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    fontSize: 13,
  },
});
