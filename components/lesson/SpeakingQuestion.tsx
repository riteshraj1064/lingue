// components/lesson/SpeakingQuestion.tsx

import { Ionicons } from "@expo/vector-icons";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";

import { Mascot } from "../Mascot";
import { SpeakingQuestionData } from "./types";

/* ============================================================================
   COLORS
============================================================================ */

const COLORS = {
  background1: "#D8D0FF",
  background2: "#C8BEFA",
  background3: "#E6E1FF",
  background4: "#D4F2EE",

  text: "#28223F",
  textSecondary: "#625B78",
  textMuted: "#89829D",

  purple: "#7351F5",
  purpleDark: "#593BC9",

  cyan: "#45CEC4",

  success: "#20C98A",
  danger: "#EF6672",

  white: "#FFFFFF",

  /*
   * Glass colors are intentionally transparent.
   * Do not increase these to opaque white.
   */
  glassWhite: "rgba(255,255,255,0.075)",
  glassWhiteSoft: "rgba(255,255,255,0.045)",
  glassWhiteStrong: "rgba(255,255,255,0.115)",

  glassPurple: "rgba(115,81,245,0.075)",
  glassPurpleStrong: "rgba(115,81,245,0.12)",

  border: "rgba(255,255,255,0.48)",
  borderSoft: "rgba(255,255,255,0.30)",
};

/* ============================================================================
   PROPS
============================================================================ */

interface SpeakingQuestionProps {
  question: SpeakingQuestionData;
  isRecorded: boolean;
  onRecordComplete: () => void;
  isChecked?: boolean;
  disabled?: boolean;
}

/* ============================================================================
   COMPONENT
============================================================================ */

export const SpeakingQuestion: React.FC<SpeakingQuestionProps> = ({
  question,
  isRecorded,
  onRecordComplete,
  isChecked = false,
  disabled = false,
}) => {
  const { width, height } = useWindowDimensions();

  /* --------------------------------------------------------------------------
     STATE
  -------------------------------------------------------------------------- */

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  /* --------------------------------------------------------------------------
     RESPONSIVE
  -------------------------------------------------------------------------- */

  const isSmallScreen = height < 720;
  const isVerySmallScreen = height < 640;

  const horizontalPadding = width < 360 ? 10 : 14;

  /* --------------------------------------------------------------------------
     MIC ANIMATION
  -------------------------------------------------------------------------- */

  const pulseAnim = useRef(
    new Animated.Value(1)
  ).current;

  const pulseRef =
    useRef<Animated.CompositeAnimation | null>(null);

  /* --------------------------------------------------------------------------
     WAVE ANIMATION
  -------------------------------------------------------------------------- */

  const wave1 = useRef(
    new Animated.Value(8)
  ).current;

  const wave2 = useRef(
    new Animated.Value(17)
  ).current;

  const wave3 = useRef(
    new Animated.Value(12)
  ).current;

  const wave4 = useRef(
    new Animated.Value(25)
  ).current;

  const wave5 = useRef(
    new Animated.Value(15)
  ).current;

  /* ==========================================================================
     WAVE START
  ========================================================================== */

  const startWaveAnimation = () => {
    const loop = (
      value: Animated.Value,
      min: number,
      max: number,
      duration: number
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: max,
            duration,
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: min,
            duration,
            useNativeDriver: false,
          }),
        ])
      );

    Animated.parallel([
      loop(wave1, 7, 23, 300),
      loop(wave2, 10, 32, 390),
      loop(wave3, 7, 28, 350),
      loop(wave4, 13, 38, 430),
      loop(wave5, 8, 24, 320),
    ]).start();
  };

  /* ==========================================================================
     WAVE STOP
  ========================================================================== */

  const stopWaveAnimation = () => {
    wave1.stopAnimation();
    wave2.stopAnimation();
    wave3.stopAnimation();
    wave4.stopAnimation();
    wave5.stopAnimation();

    wave1.setValue(8);
    wave2.setValue(17);
    wave3.setValue(12);
    wave4.setValue(25);
    wave5.setValue(15);
  };

  /* ==========================================================================
     SPEECH EVENTS
  ========================================================================== */

  useSpeechRecognitionEvent("start", () => {
    setIsRecording(true);

    startWaveAnimation();

    pulseRef.current?.stop();

    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ])
    );

    pulseRef.current.start();
  });

  useSpeechRecognitionEvent("end", () => {
    setIsRecording(false);

    stopWaveAnimation();

    pulseRef.current?.stop();
    pulseRef.current = null;

    pulseAnim.setValue(1);

    onRecordComplete();
  });

  useSpeechRecognitionEvent("result", (event) => {
    const value =
      event.results?.[0]?.transcript ?? "";

    console.log("Transcript:", value);

    setTranscript(value);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log(
      "Speech recognition error:",
      event.error,
      event.message
    );

    setIsRecording(false);

    stopWaveAnimation();

    pulseRef.current?.stop();
    pulseRef.current = null;

    pulseAnim.setValue(1);
  });

  /* ==========================================================================
     CLEANUP
  ========================================================================== */

  useEffect(() => {
    return () => {
      stopWaveAnimation();

      pulseRef.current?.stop();
      pulseRef.current = null;
    };
  }, []);

  /* ==========================================================================
     MICROPHONE
  ========================================================================== */

  const handleMicPress = async () => {
    if (disabled) {
      return;
    }

    if (isRecording) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    try {
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        console.warn(
          "Speech recognition permission not granted."
        );
        return;
      }

      setTranscript("");

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
      });
    } catch (error) {
      console.error(
        "Speech recognition start error:",
        error
      );
    }
  };

  /* ==========================================================================
     SIZES
  ========================================================================== */

  const mascotSize = isVerySmallScreen
    ? 62
    : isSmallScreen
      ? 72
      : 82;

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <View style={styles.container}>

      {/* ======================================================================
          SKIA FULL SCREEN BACKGROUND
      ====================================================================== */}

      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      >
        <Canvas
          style={StyleSheet.absoluteFillObject}
        >
          {/* Base gradient */}

          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width, height)}
              colors={[
                COLORS.background1,
                COLORS.background2,
                COLORS.background3,
                COLORS.background4,
              ]}
            />
          </Rect>

          {/* Large purple glass light */}

          <Circle
            cx={width * 0.02}
            cy={height * 0.08}
            r={width * 0.58}
            color="rgba(115,81,245,0.25)"
          />

          {/* Upper right light */}

          <Circle
            cx={width * 0.98}
            cy={height * 0.20}
            r={width * 0.38}
            color="rgba(145,120,255,0.16)"
          />

          {/* Cyan glass light */}

          <Circle
            cx={width * 1.04}
            cy={height * 0.48}
            r={width * 0.50}
            color="rgba(75,211,201,0.14)"
          />

          {/* Bottom purple light */}

          <Circle
            cx={width * 0.45}
            cy={height * 1.03}
            r={width * 0.65}
            color="rgba(115,81,245,0.14)"
          />

          {/* Decorative dots */}

          <Circle
            cx={width * 0.86}
            cy={height * 0.10}
            r={3}
            color="rgba(115,81,245,0.50)"
          />

          <Circle
            cx={width * 0.93}
            cy={height * 0.16}
            r={2}
            color="rgba(115,81,245,0.32)"
          />

          <Circle
            cx={width * 0.08}
            cy={height * 0.58}
            r={3}
            color="rgba(75,211,201,0.36)"
          />

          <Circle
            cx={width * 0.14}
            cy={height * 0.65}
            r={2}
            color="rgba(75,211,201,0.25)"
          />

          <Circle
            cx={width * 0.84}
            cy={height * 0.82}
            r={2.5}
            color="rgba(115,81,245,0.30)"
          />

          {/* ================================================================
              FULL SCREEN GLASS
          ================================================================ */}

          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            color="rgba(255,255,255,0.035)"
          />

          {/* Top glass light */}

          <Rect
            x={0}
            y={0}
            width={width}
            height={height * 0.45}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height * 0.45)}
              colors={[
                "rgba(255,255,255,0.15)",
                "rgba(255,255,255,0.045)",
                "rgba(255,255,255,0)",
              ]}
            />
          </Rect>

          {/* Bottom glass tint */}

          <Rect
            x={0}
            y={height * 0.70}
            width={width}
            height={height * 0.30}
          >
            <LinearGradient
              start={vec(0, height * 0.70)}
              end={vec(0, height)}
              colors={[
                "rgba(115,81,245,0)",
                "rgba(115,81,245,0.055)",
              ]}
            />
          </Rect>

          {/* Full screen glass border */}

          <RoundedRect
            x={horizontalPadding}
            y={6}
            width={width - horizontalPadding * 2}
            height={Math.max(height - 12, 1)}
            r={28}
            color="rgba(255,255,255,0.08)"
          />
        </Canvas>
      </View>

      {/* ======================================================================
          CONTENT

          IMPORTANT:
          The ScrollView itself is transparent.
          No white background.
      ====================================================================== */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: 42,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.content}>

          {/* ================================================================
              HEADER
          ================================================================ */}

          <View style={styles.header}>
            <View
              style={[
                styles.statusDot,
                isRecording &&
                styles.statusDotRecording,
                isRecorded &&
                !isRecording &&
                styles.statusDotRecorded,
              ]}
            />

            <Text style={styles.headerText}>
              SPEAKING
            </Text>

            <View style={styles.headerLine} />
          </View>

          {/* ================================================================
              PROMPT
          ================================================================ */}

          <Text style={styles.promptText}>
            {question.instruction ||
              question.prompt ||
              "Speak the target sentence."}
          </Text>

          {/* ================================================================
              TARGET SENTENCE
          ================================================================ */}

          <View
            style={[
              styles.lessonGlass,
              isSmallScreen &&
              styles.lessonGlassSmall,
            ]}
          >
            {/* glass shine */}

            <View
              pointerEvents="none"
              style={styles.panelShine}
            />

            {/* mascot */}

            <View style={styles.mascotArea}>
              <View
                pointerEvents="none"
                style={styles.mascotGlow}
              />

              <Mascot
                size={mascotSize}
                pose="encouraging"
                floating={false}
              />
            </View>

            {/* sentence */}

            <View style={styles.sentenceGlass}>
              <View
                pointerEvents="none"
                style={styles.sentenceShine}
              />

              <Text style={styles.sayLabel}>
                SAY THIS
              </Text>

              <Text style={styles.sentenceText}>
                {question.targetSentence}
              </Text>
            </View>
          </View>

          {/* ================================================================
              MICROPHONE
          ================================================================ */}

          <View style={styles.recordSection}>
            <Animated.View
              style={{
                transform: [
                  {
                    scale: pulseAnim,
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.micOuter,

                  isRecording &&
                  styles.micRecording,

                  isRecorded &&
                  !isRecording &&
                  styles.micRecorded,
                ]}
                onPress={handleMicPress}
                activeOpacity={0.85}
                disabled={disabled}
              >
                <View style={styles.micOuterRing} />

                <View style={styles.micInner}>
                  <Ionicons
                    name={
                      isRecorded &&
                        !isRecording
                        ? "checkmark"
                        : isRecording
                          ? "stop"
                          : "mic"
                    }
                    size={34}
                    color={COLORS.white}
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Text
              style={[
                styles.micLabel,

                isRecording &&
                styles.recordingLabel,

                isRecorded &&
                !isRecording &&
                styles.recordedLabel,
              ]}
            >
              {isRecording
                ? "Listening…"
                : isRecorded
                  ? "Recorded! Ready to check"
                  : "Tap to record"}
            </Text>
          </View>

          {/* ================================================================
              TRANSCRIPT
          ================================================================ */}

          {transcript.length > 0 && (
            <View style={styles.glassPanel}>
              <View style={styles.transcriptContent}>

                <View style={styles.iconGlass}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={16}
                    color={COLORS.purple}
                  />
                </View>

                <View style={styles.transcriptBody}>
                  <Text style={styles.smallLabel}>
                    YOU SAID
                  </Text>

                  <Text style={styles.transcriptText}>
                    {transcript}
                  </Text>
                </View>

              </View>
            </View>
          )}

          {/* ================================================================
              WAVEFORM
          ================================================================ */}

          <View style={styles.glassPanel}>
            <View style={styles.waveContent}>

              <View style={styles.waveRow}>
                {[
                  wave1,
                  wave2,
                  wave3,
                  wave4,
                  wave5,
                  wave3,
                  wave2,
                  wave1,
                ].map(
                  (animation, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.waveBar,
                        index !== 7 &&
                        styles.waveSpacing,
                        {
                          height: animation,
                          backgroundColor:
                            isRecording
                              ? COLORS.purple
                              : isRecorded
                                ? COLORS.success
                                : "rgba(115,81,245,0.30)",
                        },
                      ]}
                    />
                  )
                )}
              </View>

              <Text style={styles.waveLabel}>
                {isRecording
                  ? "Listening to your voice"
                  : isRecorded
                    ? "Voice captured"
                    : "Voice recording"}
              </Text>

            </View>
          </View>

          {/* ================================================================
              HINT
          ================================================================ */}

          <View style={styles.glassPanel}>
            <View style={styles.hintContent}>

              <View style={styles.iconGlass}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={COLORS.purple}
                />
              </View>

              <Text style={styles.hintText}>
                {question.hint ||
                  "Try to speak clearly and at a natural pace."}
              </Text>

            </View>
          </View>

          <View style={styles.bottomSpace} />

        </View>
      </ScrollView>
    </View>
  );
};

/* ============================================================================
   STYLES
============================================================================ */

const styles = StyleSheet.create({

  /* ==========================================================================
     ROOT
  ========================================================================== */

  container: {
    flex: 1,
    width: "100%",

    /*
     * IMPORTANT:
     * Transparent so Skia is visible.
     */
    backgroundColor: "transparent",

    overflow: "hidden",
  },

  /* ==========================================================================
     SCROLL
  ========================================================================== */

  scrollView: {
    flex: 1,
    width: "100%",

    backgroundColor: "transparent",
  },

  scrollContent: {
    width: "100%",

    paddingTop: 10,

    backgroundColor: "transparent",
  },

  /* ==========================================================================
     CONTENT
  ========================================================================== */

  content: {
    width: "100%",

    backgroundColor: "transparent",

    paddingTop: 4,
    paddingBottom: 12,
  },

  /* ==========================================================================
     HEADER GLASS
  ========================================================================== */

  header: {
    alignSelf: "center",

    minHeight: 34,

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 15,

    borderRadius: 20,

    /*
     * Purple tinted glass rather than white.
     */
    backgroundColor:
      "rgba(115,81,245,0.075)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.52)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.10,

    shadowRadius: 9,

    elevation: 0,
  },

  statusDot: {
    width: 7,
    height: 7,

    borderRadius: 4,

    marginRight: 7,

    backgroundColor:
      COLORS.purple,
  },

  statusDotRecording: {
    backgroundColor:
      COLORS.danger,
  },

  statusDotRecorded: {
    backgroundColor:
      COLORS.success,
  },

  headerText: {
    fontSize: 10,

    fontWeight: "900",

    letterSpacing: 1.7,

    color: COLORS.purpleDark,
  },

  headerLine: {
    width: 18,
    height: 1,

    marginLeft: 8,

    backgroundColor:
      "rgba(115,81,245,0.25)",
  },

  /* ==========================================================================
     PROMPT
  ========================================================================== */

  promptText: {
    width: "100%",

    marginTop: 17,
    marginBottom: 15,

    paddingHorizontal: 8,

    textAlign: "center",

    color: COLORS.text,

    fontSize: 22,

    lineHeight: 29,

    fontWeight: "900",

    letterSpacing: -0.45,
  },

  /* ==========================================================================
     MAIN GLASS
  ========================================================================== */

  lessonGlass: {
    width: "100%",

    minHeight: 142,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 7,
    paddingVertical: 8,

    position: "relative",

    overflow: "hidden",

    borderRadius: 25,

    /*
     * Main glass.
     *
     * This is intentionally translucent.
     * The Skia background remains visible.
     */
    backgroundColor:
      "rgba(115,81,245,0.065)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.48)",

    shadowColor:
      COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.08,

    shadowRadius: 18,

    elevation: 0,
  },

  lessonGlassSmall: {
    minHeight: 122,
  },

  panelShine: {
    position: "absolute",

    top: 0,
    left: 18,
    right: 18,

    height: 1,

    backgroundColor:
      "rgba(255,255,255,0.70)",
  },

  /* ==========================================================================
     MASCOT
  ========================================================================== */

  mascotArea: {
    width: 86,

    minHeight: 108,

    alignItems: "center",

    justifyContent: "center",

    position: "relative",
  },

  mascotGlow: {
    position: "absolute",

    width: 70,
    height: 70,

    borderRadius: 35,

    backgroundColor:
      "rgba(115,81,245,0.13)",
  },

  /* ==========================================================================
     SENTENCE GLASS
  ========================================================================== */

  sentenceGlass: {
    flex: 1,

    minHeight: 96,

    justifyContent: "center",

    position: "relative",

    overflow: "hidden",

    paddingHorizontal: 15,
    paddingVertical: 12,

    borderRadius: 21,

    /*
     * Slight purple tint makes it look like glass,
     * not a white rectangle.
     */
    backgroundColor:
      "rgba(115,81,245,0.055)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.50)",
  },

  sentenceShine: {
    position: "absolute",

    top: 0,
    left: 12,
    right: 12,

    height: 1,

    backgroundColor:
      "rgba(255,255,255,0.76)",
  },

  sayLabel: {
    marginBottom: 5,

    fontSize: 8,

    fontWeight: "900",

    letterSpacing: 1.4,

    color: COLORS.purple,
  },

  sentenceText: {
    color: COLORS.text,

    fontSize: 16,

    lineHeight: 22,

    fontWeight: "800",
  },

  /* ==========================================================================
     MICROPHONE
  ========================================================================== */

  recordSection: {
    width: "100%",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 20,

    marginBottom: 15,
  },

  micOuter: {
    width: 92,
    height: 92,

    borderRadius: 46,

    alignItems: "center",
    justifyContent: "center",

    position: "relative",

    backgroundColor:
      "rgba(115,81,245,0.88)",

    borderWidth: 1.5,

    borderColor:
      "rgba(255,255,255,0.70)",

    shadowColor:
      COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 9,
    },

    shadowOpacity: 0.20,

    shadowRadius: 18,

    elevation: 0,
  },

  micRecording: {
    backgroundColor:
      "rgba(239,102,114,0.90)",

    shadowColor:
      COLORS.danger,
  },

  micRecorded: {
    backgroundColor:
      "rgba(32,201,138,0.90)",

    shadowColor:
      COLORS.success,
  },

  micOuterRing: {
    position: "absolute",

    width: 77,
    height: 77,

    borderRadius: 39,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.30)",
  },

  micInner: {
    width: 66,
    height: 66,

    borderRadius: 33,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.14)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.40)",
  },

  micLabel: {
    marginTop: 9,

    fontSize: 12,

    fontWeight: "800",

    color:
      COLORS.textSecondary,

    textAlign: "center",
  },

  recordingLabel: {
    color: COLORS.danger,
  },

  recordedLabel: {
    color: COLORS.success,
  },

  /* ==========================================================================
     SMALL GLASS PANELS
  ========================================================================== */

  glassPanel: {
    width: "100%",

    minHeight: 55,

    position: "relative",

    overflow: "hidden",

    marginBottom: 11,

    borderRadius: 20,

    /*
     * No white card.
     */
    backgroundColor:
      "rgba(115,81,245,0.045)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.40)",

    shadowColor:
      COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.05,

    shadowRadius: 12,

    elevation: 0,
  },

  /* ==========================================================================
     TRANSCRIPT
  ========================================================================== */

  transcriptContent: {
    minHeight: 55,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 11,

    paddingVertical: 9,
  },

  iconGlass: {
    width: 31,
    height: 31,

    borderRadius: 16,

    marginRight: 9,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(115,81,245,0.085)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.42)",
  },

  transcriptBody: {
    flex: 1,
  },

  smallLabel: {
    marginBottom: 2,

    fontSize: 8,

    fontWeight: "900",

    letterSpacing: 1,

    color: COLORS.purple,
  },

  transcriptText: {
    fontSize: 13,

    lineHeight: 18,

    color: COLORS.text,

    fontWeight: "700",

    fontStyle: "italic",
  },

  /* ==========================================================================
     WAVEFORM
  ========================================================================== */

  waveContent: {
    minHeight: 72,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 12,

    paddingVertical: 8,
  },

  waveRow: {
    width: "100%",

    height: 36,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",
  },

  waveBar: {
    width: 5,

    minHeight: 5,

    borderRadius: 5,
  },

  waveSpacing: {
    marginRight: 6,
  },

  waveLabel: {
    marginTop: 2,

    fontSize: 8,

    fontWeight: "800",

    letterSpacing: 0.4,

    color: COLORS.textMuted,
  },

  /* ==========================================================================
     HINT
  ========================================================================== */

  hintContent: {
    minHeight: 55,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 11,

    paddingVertical: 9,
  },

  hintText: {
    flex: 1,

    fontSize: 11,

    lineHeight: 17,

    color: COLORS.textSecondary,

    fontWeight: "700",
  },

  /* ==========================================================================
     BOTTOM
  ========================================================================== */

  bottomSpace: {
    height: 18,
  },
});

export default SpeakingQuestion;