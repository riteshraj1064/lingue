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
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors as themeColors } from "@/constant/constant";
import { supabase } from "@/services/supabase";

const mascotImage = require("@/assets/images/mascot.png");

const images = {
    mascotWelcome: mascotImage,
    mascot: mascotImage,
};

const colors = {
    ...themeColors,
    primary: Object.assign(new String(themeColors.primary) as any, {
        purple: themeColors.primary,
        toString() {
            return themeColors.primary;
        },
    }),
    neutral: {
        textPrimary: themeColors.textPrimary,
        textSecondary: themeColors.textSecondary,
        border: themeColors.border,
        surface: themeColors.inputBackground,
    },
    semantic: {
        warning: themeColors.rewardOrange,
        success: themeColors.success,
        error: themeColors.danger,
    },
};

const API_URL =
    process.env.EXPO_PUBLIC_API_URL ?? "";

const AGENT_USER_ID = "ai-teacher";

// Current lesson direction: Hindi -> English.
// Set to null after correcting the course records in Supabase.
const LESSON_LANGUAGE_OVERRIDE: { source: string; target: string } | null = {
    source: "hi",
    target: "en",
};

type CallStatus =
    | "idle"
    | "connecting"
    | "joined"
    | "error";

type AgentStatus =
    | "idle"
    | "connecting"
    | "connected"
    | "failed";

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

type PartialCaption = {
    speaker: "agent" | "user";
    text: string;
};

export default function AITeacherScreen() {
    const { lessonId } =
        useLocalSearchParams<{ lessonId: string }>();

    const router = useRouter();

    const [lessonData, setLessonData] =
        useState<LessonResponse | null>(null);

    const [loadingLesson, setLoadingLesson] =
        useState(true);

    const [client, setClient] =
        useState<StreamVideoClient | null>(null);

    const [call, setCall] =
        useState<Call | null>(null);

    const [callStatus, setCallStatus] =
        useState<CallStatus>("idle");

    const [agentStatus, setAgentStatus] =
        useState<AgentStatus>("idle");

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

    // ============================================================
    // LOAD LESSON
    // ============================================================

    useEffect(() => {
        mountedRef.current = true;

        loadLesson();

        return () => {
            mountedRef.current = false;

            cleanup();
        };
    }, [lessonId]);

    // ============================================================
    // LOAD LESSON DETAIL FROM YOUR RPC
    // ============================================================

    async function loadLesson() {
        if (!lessonId) return;

        try {
            setLoadingLesson(true);

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error(
                    "User is not authenticated"
                );
            }

            /*
             * CHANGE THIS RPC NAME to your actual
             * lesson-detail RPC name.
             *
             * Example:
             * get_lesson_details
             */

            const { data, error } =
                await supabase.rpc(
                    "get_lesson_details",
                    {
                        p_lesson_id: Number(lessonId),
                    }
                );

            if (error) {
                console.error(
                    "Lesson detail RPC error:",
                    error
                );

                throw error;
            }

            if (!data?.success) {
                throw new Error(
                    "Failed to load lesson"
                );
            }

            if (!mountedRef.current) return;
            console.log(data)
            setLessonData(data);

            // Start Stream after lesson data exists.
            await startCall(data);
        } catch (error) {
            console.error(
                "Failed to load AI Teacher lesson:",
                error
            );

            if (mountedRef.current) {
                setCallStatus("error");
            }
        } finally {
            if (mountedRef.current) {
                setLoadingLesson(false);
            }
        }
    }

    // ============================================================
    // START STREAM CALL
    // ============================================================

    async function startCall(
        data: LessonResponse
    ) {
        setCallStatus("connecting");

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error(
                    "Not authenticated"
                );
            }

            // ========================================================
            // GET STREAM TOKEN
            // ========================================================

            const tokenResponse = await fetch(
                `${API_URL}/api/stream-token`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
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

            // ========================================================
            // CREATE STREAM CLIENT
            // ========================================================

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

            // ========================================================
            // UNIQUE AI TEACHER CALL
            // ========================================================

            const callId =
                `ai-teacher-${data.lesson.id}-${userId}`;

            const streamCall =
                streamClient.call(
                    "default",
                    callId
                );

            // ========================================================
            // JOIN
            // ========================================================

            await streamCall.join({
                create: true,
            });

            // ========================================================
            // MUTE MICROPHONE
            // ========================================================

            try {
                await streamCall.microphone.disable();
            } catch (error) {
                console.warn(
                    "Failed to disable microphone:",
                    error
                );
            }

            // ========================================================
            // BUILD AI LESSON CONTEXT
            // ========================================================

            const sourceLanguage =
                LESSON_LANGUAGE_OVERRIDE?.source ??
                data.lesson.course.source_language ??
                "hi";
            const targetLanguage =
                LESSON_LANGUAGE_OVERRIDE?.target ??
                data.lesson.course.target_language ??
                "en";

            const aiContext = buildAIContext(
                data,
                sourceLanguage,
                targetLanguage
            );

            // ========================================================
            // SEND ONE COMPLETE, NORMALIZED LESSON PAYLOAD TO STREAM
            // ========================================================
            const lessonCustom = {
                lesson_id: data.lesson.id,
                lesson_title: data.lesson.title,
                lesson_description: data.lesson.description,
                unit_title: data.lesson.unit.title,
                course_title: data.lesson.course.title,
                source_language: sourceLanguage,
                target_language: targetLanguage,
                question_count: data.question_count,
                questions: aiContext.questions,
                vocabulary: data.vocabulary ?? [],
                phrases: data.phrases ?? [],
                topics: data.topics ?? [],
                intro_message:
                    `Great job completing ${data.lesson.title}! ` +
                    `Let's practice what you learned together.`,
            };

            console.log("AI TEACHER LESSON PAYLOAD", lessonCustom);

            await streamCall.update({
                custom: lessonCustom,
            });

            // ========================================================
            // CLOSED CAPTIONS
            // ========================================================

            try {
                await streamCall.startClosedCaptions();
            } catch (error) {
                console.warn(
                    "Closed captions failed:",
                    error
                );
            }

            callRef.current =
                streamCall;

            clientRef.current =
                streamClient;

            if (!mountedRef.current) {
                await streamCall.leave();
                await streamClient.disconnectUser();
                return;
            }

            setClient(streamClient);
            setCall(streamCall);
            setCallStatus("joined");

            // ========================================================
            // START PYTHON AI AGENT
            // ========================================================

            await startAgentSession(
                callId,
                session.access_token
            );
        } catch (error) {
            console.error(
                "AI Teacher Stream error:",
                error
            );

            if (mountedRef.current) {
                setCallStatus("error");
            }
        }
    }

    // ============================================================
    // BUILD AI CONTEXT
    // ============================================================

    function buildAIContext(
        data: LessonResponse,
        sourceLanguage?: string,
        targetLanguage?: string
    ) {
        return {
            lesson: {
                id: data.lesson.id,
                title: data.lesson.title,
                description:
                    data.lesson.description,
            },

            course: {
                title:
                    data.lesson.course.title,
                source_language:
                    sourceLanguage ?? data.lesson.course.source_language,
                target_language:
                    targetLanguage ?? data.lesson.course.target_language,
            },

            unit: {
                title:
                    data.lesson.unit.title,
            },

            questions:
                data.questions.map(
                    (question, index) => ({
                        number: index + 1,

                        type: question.type,

                        prompt:
                            question.prompt,

                        instruction:
                            question.instruction,

                        correct_answers:
                            (question.answer.correct_options ?? [])
                                .map((option) => option.text),

                        accepted_answers:
                            question.answer
                                .accepted_answers,

                        target_text:
                            question.answer
                                .target_text,

                        target_translation:
                            question.answer
                                .target_translation,
                    })
                ),
        };
    }

    // ============================================================
    // AI SYSTEM PROMPT
    // ============================================================

    //     function createSystemPrompt(
    //         data: LessonResponse
    //     ) {
    //         const targetCode =
    //             // @ts-ignore
    //             LESSON_LANGUAGE_OVERRIDE?.target ?? data.lesson.course.target_language || "en";
    //         const sourceCode =
    //             // @ts-ignore
    //             LESSON_LANGUAGE_OVERRIDE?.source ?? data.lesson.course.source_language || "hi";

    //         const LANGUAGE_NAMES: Record<string, string> = {
    //             en: "English",
    //             hi: "Hindi",
    //             de: "German",
    //             fr: "French",
    //             es: "Spanish",
    //         };

    //         const targetLanguage =
    //             LANGUAGE_NAMES[String(targetCode).toLowerCase()] ?? String(targetCode);
    //         const sourceLanguage =
    //             LANGUAGE_NAMES[String(sourceCode).toLowerCase()] ?? String(sourceCode);

    //         return `
    // You are an AI language teacher.

    // You are helping the student practice the lesson material using ONLY the provided lesson data.

    // LESSON:
    // ${data.lesson.title}

    // DESCRIPTION:
    // ${data.lesson.description ?? ""}

    // COURSE:
    // ${data.lesson.course.title}

    // SOURCE LANGUAGE (Known language):
    // ${sourceLanguage}

    // TARGET LANGUAGE (Language being learned):
    // ${targetLanguage}

    // CRITICAL LANGUAGE DIRECTIVE:
    // - You MUST speak ONLY in ${targetLanguage} for practice.
    // - You MAY use ${sourceLanguage} ONLY for short hints when requested.
    // - DO NOT speak German, French, Spanish, or ANY unrequested language under any circumstances!

    // UNIT:
    // ${data.lesson.unit.title}

    // LESSON QUESTIONS & DATA:
    // ${JSON.stringify(
    //             data.questions,
    //             null,
    //             2
    //         )}

    // YOUR JOB:
    // 1. Ask practice questions derived ONLY from the provided lesson data (words and sentences).
    // 2. Do NOT invent outside questions, outside words, or outside sentences not present in the provided lesson data.
    // 3. Ask short questions, one at a time.
    // 4. Give the student time to answer.
    // 5. Correct mistakes gently using lesson data.
    // 6. Once all questions, words, and sentences in the provided lesson data have been asked and completed:
    //    Say a brief goodbye message (including "Goodbye!") and end the call automatically.
    // `;
    //     }

    // ============================================================
    // INTRO MESSAGE
    // ============================================================

    function createIntroMessage(
        data: LessonResponse
    ) {
        return `Great job completing ${data.lesson.title}! Let's practice what you learned together. I'll ask you a few simple questions. Hold the microphone and answer me.`;
    }

    // ============================================================
    // START AGENT
    // ============================================================

    async function startAgentSession(
        callId: string,
        accessToken: string
    ) {
        setAgentStatus("connecting");

        try {
            const response =
                await fetch(
                    `${API_URL}/api/agent-session`,
                    {
                        method: "POST",

                        headers: {
                            Authorization: `Bearer ${accessToken}`,
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
                console.error(
                    "Agent session error:",
                    data
                );

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
                "Agent session failed:",
                error
            );

            if (mountedRef.current) {
                setAgentStatus("failed");
            }
        }
    }

    // ============================================================
    // STOP AGENT
    // ============================================================

    async function stopAgentSession() {
        const callId =
            callRef.current?.id;

        const sessionId =
            agentSessionRef.current;

        if (!callId || !sessionId) {
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
                `${API_URL}/api/agent-session?callId=${encodeURIComponent(
                    callId
                )}&sessionId=${encodeURIComponent(
                    sessionId
                )}`,
                {
                    method: "DELETE",

                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
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
        const activeCall = callRef.current;
        const activeClient = clientRef.current;

        try {
            await stopAgentSession();
        } catch (error) {
            console.warn("Failed to stop agent session:", error);
        }

        try {
            if (activeCall) await activeCall.leave();
        } catch (error) {
            console.warn("Failed to leave Stream call:", error);
        }

        try {
            if (activeClient) await activeClient.disconnectUser();
        } catch (error) {
            console.warn("Failed to disconnect Stream client:", error);
        }

        callRef.current = null;
        clientRef.current = null;
        agentSessionRef.current = null;
    }

    // ============================================================
    // LEAVE
    // ============================================================

    const handleLeave =
        useCallback(async () => {
            if (leavingRef.current) return;
            leavingRef.current = true;

            await cleanup();

            if (mountedRef.current) {
                router.replace("/(tabs)");
            }
        }, [router]);

    // ============================================================
    // RETRY AGENT
    // ============================================================

    async function retryAgent() {
        if (!callRef.current) {
            return;
        }

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
            return;
        }

        await startAgentSession(
            callRef.current.id,
            session.access_token
        );
    }

    // ============================================================
    // UI
    // ============================================================

    if (loadingLesson) {
        return (
            <SafeAreaView
                style={styles.screen}
            >
                <View
                    style={styles.center}
                >
                    <ActivityIndicator
                        size="large"
                        color={
                            colors.primary.purple
                        }
                    />

                    <Text
                        style={
                            styles.loadingText
                        }
                    >
                        Preparing your AI Teacher...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!lessonData) {
        return (
            <SafeAreaView
                style={styles.screen}
            >
                <View
                    style={styles.center}
                >
                    <Text
                        style={
                            styles.errorText
                        }
                    >
                        Lesson not found
                    </Text>

                    < TouchableOpacity
                        style={
                            styles.retryButtonLarge
                        }
                        onPress={loadLesson}
                    >
                        <Text
                            style={
                                styles.retryButtonText
                            }
                        >
                            Try again
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const displayStatus =
        getDisplayStatus(
            callStatus,
            agentStatus
        );

    return (
        <SafeAreaView
            style={styles.screen}
        >
            {/* HEADER */}

            < View style={styles.header} >
                <TouchableOpacity
                    onPress={handleLeave}
                    hitSlop={8}
                >
                    <Ionicons
                        name="chevron-back"
                        size={24}
                        color={
                            colors.neutral
                                .textPrimary
                        }
                    />
                </TouchableOpacity>

                < Text
                    style={
                        styles.headerTitle
                    }
                >
                    AI Teacher
                </Text>

                < TouchableOpacity
                    style={
                        styles.endCallButton
                    }
                    onPress={handleLeave}
                >
                    <Ionicons
                        name="call"
                        size={18}
                        color="#FFFFFF"
                        style={
                            styles.rotatedIcon
                        }
                    />
                </TouchableOpacity>
            </View>

            {/* STATUS */}

            <View
                style={
                    styles.statusRow
                }
            >
                <View
                    style={
                        [
                            styles.onlineDot,
                            {
                                backgroundColor:
                                    displayStatus.color,
                            },
                        ]
                    }
                />

                < Text
                    style={
                        [
                            styles.onlineText,
                            {
                                color:
                                    displayStatus.color,
                            },
                        ]}
                >
                    {displayStatus.label}
                </Text>
            </View>

            {/* CALL */}

            {
                callStatus === "joined" &&
                    client &&
                    call ? (
                    <StreamVideo client={client} >
                        <StreamCall call={call}>
                            <ActiveCallContent
                                lesson={lessonData}
                                agentStatus={
                                    agentStatus
                                }
                                call={call}
                                onRetry={
                                    retryAgent
                                }
                                onLeave={
                                    handleLeave
                                }
                            />
                        </StreamCall>
                    </StreamVideo>
                ) : (
                    <View
                        style={
                            styles.callArea
                        }
                    >
                        <Image
                            source={
                                images.mascotWelcome
                            }
                            contentFit="contain"
                            style={
                                styles.mascot
                            }
                        />

                        <View
                            style={
                                styles.responseBubble
                            }
                        >
                            {callStatus ===
                                "connecting" && (
                                    <ActivityIndicator
                                        size="small"
                                        color={
                                            colors.primary
                                                .purple
                                        }
                                        style={
                                            styles.spinner
                                        }
                                    />
                                )
                            }

                            <View
                                style={
                                    styles.responseBubbleText
                                }
                            >
                                <Text
                                    style={
                                        styles.responsePrimary
                                    }
                                >
                                    {callStatus ===
                                        "error"
                                        ? "Connection failed"
                                        : "Connecting..."
                                    }
                                </Text>

                                < Text
                                    style={
                                        styles.responseSecondary
                                    }
                                >
                                    {callStatus ===
                                        "error"
                                        ? "Tap to retry"
                                        : "Setting up your AI teacher"}
                                </Text>
                            </View>

                            {
                                callStatus ===
                                "error" && (
                                    <TouchableOpacity
                                        style={
                                            styles.retryButton
                                        }
                                        onPress={
                                            () =>
                                                startCall(
                                                    lessonData
                                                )
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
                    </View>
                )}

            {/* FEEDBACK */}

            <View
                style={
                    styles.feedbackRow
                }
            >
                <FeedbackItem
                    label="Lesson"
                    value={
                        lessonData.lesson
                            .title
                    }
                />

                <View
                    style={
                        styles.feedbackDivider
                    }
                />

                < FeedbackItem
                    label="Questions"
                    value={
                        String(
                            lessonData.question_count
                        )
                    }
                />

                <View
                    style={
                        styles.feedbackDivider
                    }
                />

                < FeedbackItem
                    label="XP"
                    value={`+${lessonData.lesson.xp_reward}`}
                />
            </View>
        </SafeAreaView>
    );
}

// ============================================================
// ACTIVE CALL
// ============================================================

function ActiveCallContent({
    lesson,
    agentStatus,
    call,
    onRetry,
    onLeave,
}: {
    lesson: LessonResponse;
    agentStatus: AgentStatus;
    call: Call;
    onRetry: () => void;
    onLeave: () => void;
}) {
    const {
        useMicrophoneState,
        useCallClosedCaptions,
        useParticipants,
    } = useCallStateHooks();

    const { microphone } =
        useMicrophoneState();

    const captions =
        useCallClosedCaptions();

    const participants =
        useParticipants();

    const agentJoinedRef =
        useRef(false);

    const leavingRef =
        useRef(false);

    const leaveTimerRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isHeld, setIsHeld] =
        useState(false);

    const [partial, setPartial] =
        useState<PartialCaption | null>(
            null
        );

    const partialTimerRef =
        useRef<ReturnType<
            typeof setTimeout
        > | null>(null);

    const requestLeave = useCallback(() => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        onLeave();
    }, [onLeave]);

    const scheduleAutoLeave = useCallback(() => {
        if (leaveTimerRef.current) return;
        leaveTimerRef.current = setTimeout(() => {
            requestLeave();
        }, 1200);
    }, [requestLeave]);

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

    // Monitor AI Teacher participant leaving (when all questions are done)
    useEffect(() => {
        const hasAgent = participants.some(
            (p: any) => p.userId === AGENT_USER_ID || p.user?.id === AGENT_USER_ID
        );

        if (hasAgent) {
            agentJoinedRef.current = true;
        } else if (agentJoinedRef.current) {
            // AI Teacher left after completing all questions
            requestLeave();
        }
    }, [participants, onLeave]);

    // ============================================================
    // CUSTOM TRANSCRIPTS & END CALL EVENTS
    // ============================================================

    useEffect(() => {
        const unsubscribeCustom =
            call.on(
                "custom",
                (event: any) => {
                    const data =
                        event?.custom ?? event?.data ?? event ?? {};

                    if (
                        data.type === "end_call" ||
                        data.type === "lesson_completed" ||
                        event?.type === "end_call"
                    ) {
                        requestLeave();
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
                            (data.speaker === "agent" || !data.speaker) &&
                            checkGoodbye(data.text)
                        ) {
                            scheduleAutoLeave();
                        }

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

        const unsubscribeParticipantLeft =
            call.on(
                //@ts-ignore
                "participant.left",
                (event: any) => {
                    const pId = event?.participant?.user?.id ?? event?.participant?.userId;
                    if (pId === AGENT_USER_ID) {
                        requestLeave();
                    }
                }
            );

        const unsubscribeEnded =
            call.on(
                "call.session_ended",
                () => {
                    requestLeave();
                }
            );

        return () => {
            unsubscribeCustom();
            unsubscribeParticipantLeft();
            unsubscribeEnded();

            if (
                partialTimerRef.current
            ) {
                clearTimeout(
                    partialTimerRef.current
                );
            }
        };
    }, [call, onLeave, scheduleAutoLeave]);

    useEffect(() => {
        if (captions.length > 0) {
            setPartial(null);

            if (
                partialTimerRef.current
            ) {
                clearTimeout(
                    partialTimerRef.current
                );
            }

            const lastCaption = captions[captions.length - 1];

            const isTeacher = lastCaption?.user?.id === AGENT_USER_ID;
            if (isTeacher && checkGoodbye(lastCaption?.text)) {
                scheduleAutoLeave();
            }
        }
    }, [captions, scheduleAutoLeave]);

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

    const showCaptions =
        partial !== null ||
        captions.length > 0;

    return (
        <>
            {/* CALL AREA */}

            < View
                style={
                    styles.callArea
                }
            >
                <Image
                    source={
                        images.mascotWelcome
                    }
                    contentFit="contain"
                    style={
                        [
                            styles.mascot,
                            agentStatus ===
                            "connecting" &&
                            styles.mascotDimmed,
                        ]}
                />

                {/* CAPTIONS */}

                {
                    showCaptions ? (
                        <View
                            style={
                                styles.captionsContainer
                            }
                        >
                            {
                                partial ? (
                                    <CaptionBubble
                                        speaker={
                                            partial.speaker
                                        }
                                        text={
                                            partial.text
                                        }
                                        partial
                                    />
                                ) : (
                                    captions.map(
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
                                                    key={`${caption.start_time}-${index}`
                                                    }
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
                                    )
                                )
                            }
                        </View>
                    ) : (
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
                                        style={
                                            styles.spinner
                                        }
                                    />
                                )}

                            <View
                                style={
                                    styles.responseBubbleText
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
                                        : agentStatus ===
                                            "failed"
                                            ? "Agent unavailable"
                                            : "Starting lesson..."}
                                </Text>

                                < Text
                                    style={
                                        styles.responseSecondary
                                    }
                                >
                                    {agentStatus ===
                                        "connected"
                                        ? "Hold the mic and answer"
                                        : agentStatus ===
                                            "failed"
                                            ? "Tap retry to reconnect"
                                            : "Your teacher is joining"}
                                </Text>
                            </View>

                            {
                                agentStatus ===
                                "failed" && (
                                    <TouchableOpacity
                                        style={
                                            styles.retryButton
                                        }
                                        onPress={onRetry}
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
                                )
                            }
                        </View>
                    )}
            </View>

            {/* PUSH TO TALK */}

            <View
                style={
                    styles.pushToTalkSection
                }
            >
                <View
                    style={
                        styles.pushToTalkContainer
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
                        style={({
                            pressed,
                        }) => [
                                styles.micButtonOuter,
                                (pressed ||
                                    isHeld) &&
                                styles.micButtonOuterActive,
                            ]}
                    >
                        {({ pressed }) => {
                            const active =
                                pressed ||
                                isHeld;

                            return (
                                <View
                                    style={
                                        [
                                            styles.micButton,
                                            active &&
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
                                                active
                                                    ? "mic"
                                                    : "mic-outline"
                                            }
                                            size={34}
                                            color={
                                                active
                                                    ? "#FFFFFF"
                                                    : isReady
                                                        ? colors
                                                            .neutral
                                                            .textPrimary
                                                        : colors
                                                            .neutral
                                                            .textSecondary
                                            }
                                        />
                                    )
                                    }
                                </View>
                            );
                        }}
                    </Pressable>

                    < Text
                        style={
                            [
                                styles.pushToTalkLabel,
                                isHeld &&
                                styles.pushToTalkLabelActive,
                            ]}
                    >
                        {
                            isHeld
                                ? "Listening..."
                                : isReady
                                    ? "Push & hold to speak"
                                    : "Waiting for teacher..."
                        }
                    </Text>
                </View>
            </View>
        </>
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
            style={
                [
                    styles.captionBubble,
                    isTeacher
                        ? styles.captionBubbleTeacher
                        : styles.captionBubbleUser,
                    partial &&
                    styles.captionBubblePartial,
                ]}
        >
            <Text
                style={
                    [
                        styles.captionSpeaker,
                        isTeacher
                            ? styles.captionSpeakerTeacher
                            : styles.captionSpeakerUser,
                    ]
                }
            >
                {
                    isTeacher
                        ? "AI Teacher"
                        : "You"
                }
            </Text>

            < Text
                style={
                    [
                        styles.captionText,
                        isTeacher
                            ? styles.captionTextTeacher
                            : styles.captionTextUser,
                    ]}
            >
                {text}
            </Text>
        </View>
    );
}

// ============================================================
// FEEDBACK ITEM
// ============================================================

function FeedbackItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <View
            style={
                styles.feedbackItem
            }
        >
            <Text
                style={
                    styles.feedbackLabel
                }
            >
                {label}
            </Text>

            < Text
                style={
                    styles.feedbackValue
                }
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
}

// ============================================================
// STATUS
// ============================================================

function getDisplayStatus(
    callStatus: CallStatus,
    agentStatus: AgentStatus
): {
    color: string;
    label: string;
} {
    if (callStatus === "joined") {
        const map: Record<
            AgentStatus,
            {
                color: string;
                label: string;
            }
        > = {
            idle: {
                color:
                    colors.neutral
                        .textSecondary,
                label: "Setting up...",
            },

            connecting: {
                color:
                    colors.semantic
                        .warning,
                label: "Joining teacher...",
            },

            connected: {
                color:
                    colors.semantic
                        .success,
                label: "Online",
            },

            failed: {
                color:
                    colors.semantic
                        .error,
                label: "Agent unavailable",
            },
        };

        return map[agentStatus];
    }

    const map: Record<
        CallStatus,
        {
            color: string;
            label: string;
        }
    > = {
        idle: {
            color:
                colors.neutral
                    .textSecondary,
            label: "Starting...",
        },

        connecting: {
            color:
                colors.semantic.warning,
            label: "Connecting...",
        },

        joined: {
            color:
                colors.semantic.success,
            label: "Online",
        },

        error: {
            color:
                colors.semantic.error,
            label: "Connection failed",
        },
    };

    return map[callStatus];
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
        paddingHorizontal: 24,
    },

    loadingText: {
        marginTop: 16,
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color:
            colors.neutral
                .textSecondary,
    },

    errorText: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color:
            colors.neutral
                .textPrimary,
    },

    retryButtonLarge: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor:
            colors.primary.purple,
    },

    retryButtonText: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 14,
        color: "#FFFFFF",
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 6,
    },

    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontFamily:
            "Poppins-SemiBold",
        fontSize: 16,
        color:
            colors.neutral
                .textPrimary,
    },

    endCallButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E8453C",
        alignItems: "center",
        justifyContent: "center",
    },

    rotatedIcon: {
        transform: [
            {
                rotate: "135deg",
            },
        ],
    },

    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 20,
        paddingBottom: 12,
    },

    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    onlineText: {
        fontFamily:
            "Poppins-Medium",
        fontSize: 13,
    },

    callArea: {
        flex: 1,
        marginHorizontal: 16,
        borderRadius: 24,
        backgroundColor: "#F4F2FF",
        overflow: "hidden",
        position: "relative",
    },

    mascot: {
        position: "absolute",
        top: 0,
        bottom: 80,
        left: -20,
        right: -20,
    },

    mascotDimmed: {
        opacity: 0.5,
    },

    responseBubble: {
        position: "absolute",
        bottom: 14,
        left: 14,
        right: 14,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,

        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 6,

        elevation: 3,
    },

    spinner: {
        marginRight: 12,
    },

    responseBubbleText: {
        flex: 1,
    },

    responsePrimary: {
        fontFamily:
            "Poppins-SemiBold",
        fontSize: 15,
        color:
            colors.neutral
                .textPrimary,
    },

    responseSecondary: {
        fontFamily:
            "Poppins-Regular",
        fontSize: 13,
        color:
            colors.neutral
                .textSecondary,
        marginTop: 1,
    },

    retryButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#EDE9FE",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 10,
    },

    captionsContainer: {
        position: "absolute",
        bottom: 14,
        left: 14,
        right: 14,
        gap: 6,
    },

    captionBubble: {
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,

        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,

        elevation: 3,
    },

    captionBubbleTeacher: {
        backgroundColor:
            colors.primary.purple,
    },

    captionBubbleUser: {
        backgroundColor: "#FFFFFF",
    },

    captionBubblePartial: {
        opacity: 0.85,
    },

    captionSpeaker: {
        fontFamily:
            "Poppins-SemiBold",
        fontSize: 11,
        marginBottom: 2,
    },

    captionSpeakerTeacher: {
        color:
            "rgba(255,255,255,0.7)",
    },

    captionSpeakerUser: {
        color:
            colors.neutral
                .textSecondary,
    },

    captionText: {
        fontFamily:
            "Poppins-Regular",
        fontSize: 14,
    },

    captionTextTeacher: {
        color: "#FFFFFF",
    },

    captionTextUser: {
        color:
            colors.neutral
                .textPrimary,
    },

    pushToTalkSection: {
        paddingVertical: 28,
        alignItems: "center",
    },

    pushToTalkContainer: {
        alignItems: "center",
        gap: 14,
    },

    micButtonOuter: {
        width: 104,
        height: 104,
        borderRadius: 52,
        borderWidth: 3,
        borderColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
    },

    micButtonOuterActive: {
        borderColor: "#C4B5FD",
        backgroundColor: "#F5F3FF",
    },

    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor:
            colors.neutral.surface,
        alignItems: "center",
        justifyContent: "center",

        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.12,
        shadowRadius: 8,

        elevation: 4,
    },

    micButtonActive: {
        backgroundColor:
            colors.primary.purple,

        shadowColor:
            colors.primary.purple,
        shadowOpacity: 0.4,
        shadowRadius: 14,

        elevation: 8,
    },

    micButtonDisabled: {
        opacity: 0.5,
    },

    pushToTalkLabel: {
        fontFamily:
            "Poppins-Medium",
        fontSize: 14,
        color:
            colors.neutral
                .textSecondary,
    },

    pushToTalkLabelActive: {
        color:
            colors.primary.purple,
    },

    feedbackRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 12,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        borderWidth: 1,
        borderColor:
            colors.neutral.border,

        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.04,
        shadowRadius: 4,

        elevation: 1,
    },

    feedbackItem: {
        flex: 1,
        alignItems: "center",
        gap: 3,
    },

    feedbackLabel: {
        fontFamily:
            "Poppins-Regular",
        fontSize: 12,
        color:
            colors.neutral
                .textSecondary,
    },

    feedbackValue: {
        fontFamily:
            "Poppins-SemiBold",
        fontSize: 13,
        color:
            colors.neutral
                .textPrimary,
    },

    feedbackDivider: {
        width: 1,
        height: 32,
        backgroundColor:
            colors.neutral.border,
    },
});