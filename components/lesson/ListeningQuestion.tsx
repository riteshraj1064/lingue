// components/lesson/ListeningQuestion.tsx

import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";

import { ListeningQuestionData } from "./types";

/* ============================================================
   COLORS
============================================================ */

const COLORS = {
  purple: "#7054F6",
  purpleDark: "#5137D8",

  text: "#17142B",
  muted: "#6E6A80",

  white: "#FFFFFF",

  green: "#20C98A",
  greenDark: "#117553",

  red: "#EF646F",
  redDark: "#B43C47",

  cyan: "#2CCDDC",

  gold: "#F5BD3F",
};

/* ============================================================
   PROPS
============================================================ */

interface ListeningQuestionProps {
  question: ListeningQuestionData;

  selectedOptionId: string | null;

  onSelect: (id: string) => void;

  typedAnswer?: string;

  onChangeTyped?: (text: string) => void;

  isChecked?: boolean;

  isCorrect?: boolean;

  disabled?: boolean;
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export const ListeningQuestion: React.FC<
  ListeningQuestionProps
> = ({
  question,
  selectedOptionId,
  onSelect,
  typedAnswer = "",
  onChangeTyped,
  isChecked = false,
  isCorrect = false,
  disabled = false,
}) => {
    const { width, height } = useWindowDimensions();

    /* ==========================================================
       RESPONSIVE SCALE
    ========================================================== */

    const scale = Math.min(
      Math.max(width / 390, 0.88),
      1.08
    );

    /* ==========================================================
       AUDIO ANIMATION
    ========================================================== */

    const scaleAnim = useRef(
      new Animated.Value(1)
    ).current;

    const slowScaleAnim = useRef(
      new Animated.Value(1)
    ).current;

    /* ==========================================================
       STATE
    ========================================================== */

    const [isSpeaking, setIsSpeaking] =
      useState(false);

    const [isFocused, setIsFocused] =
      useState(false);

    /* ==========================================================
       OPTIONS
    ========================================================== */

    const hasOptions =
      Array.isArray(question.options) &&
      question.options.length > 0;

    /* ==========================================================
       TEXT TO SPEAK
    ========================================================== */

    const textToSpeak = useMemo(() => {
      return (
        question.audioText ||
        (question as any).audio_text ||
        question.audioUrl ||
        question.prompt ||
        ""
      );
    }, [question]);

    /* ==========================================================
       SPEAK
    ========================================================== */

    const handleSpeak = useCallback(
      (
        rate: number = 0.9,
        isSlow: boolean = false
      ) => {
        if (!textToSpeak) {
          return;
        }

        const anim = isSlow
          ? slowScaleAnim
          : scaleAnim;

        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1.13,
            duration: 120,
            useNativeDriver: true,
          }),

          Animated.timing(anim, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start();

        try {
          Speech.stop();

          setIsSpeaking(true);

          const speedMultiplier =
            typeof question.audioSpeed ===
              "number"
              ? question.audioSpeed
              : 1;

          const effectiveRate = Math.max(
            0.2,
            Math.min(
              1.5,
              rate * speedMultiplier
            )
          );

          Speech.speak(textToSpeak, {
            language:
              question.audioLanguage || "en",

            rate: effectiveRate,

            onDone: () => {
              setIsSpeaking(false);
            },

            onStopped: () => {
              setIsSpeaking(false);
            },

            onError: () => {
              setIsSpeaking(false);
            },
          });
        } catch (error) {
          console.log(
            "Speech.speak error:",
            error
          );

          setIsSpeaking(false);
        }
      },
      [
        textToSpeak,
        question.audioSpeed,
        question.audioLanguage,
        scaleAnim,
        slowScaleAnim,
      ]
    );

    /* ==========================================================
       AUTO PLAY
    ========================================================== */

    useEffect(() => {
      const timer = setTimeout(() => {
        handleSpeak(0.9, false);
      }, 350);

      return () => {
        clearTimeout(timer);

        try {
          Speech.stop();
        } catch {
          // Ignore speech cleanup errors.
        }
      };
    }, [question.id]);

    /* ==========================================================
       RENDER
    ========================================================== */

    return (
      <View style={styles.container}>
        {/* ======================================================
          FIXED SKIA BACKGROUND
      ====================================================== */}

        <Canvas
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
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
                "#F3F0FF",
                "#EDE9FF",
                "#F8F7FF",
                "#EDF9F6",
              ]}
            />
          </Rect>

          {/* Purple top glow */}

          <Circle
            cx={width * 0.92}
            cy={height * 0.14}
            r={width * 0.56}
            color="rgba(112,84,246,0.14)"
          />

          {/* Cyan bottom-left glow */}

          <Circle
            cx={-width * 0.08}
            cy={height * 0.72}
            r={width * 0.50}
            color="rgba(44,205,220,0.10)"
          />

          {/* Bottom purple glow */}

          <Circle
            cx={width * 0.82}
            cy={height * 0.91}
            r={width * 0.44}
            color="rgba(112,84,246,0.08)"
          />

          {/* Center white glow */}

          <Circle
            cx={width * 0.50}
            cy={height * 0.48}
            r={width * 0.42}
            color="rgba(255,255,255,0.23)"
          />

          {/* Decorative dots */}

          <Circle
            cx={width * 0.09}
            cy={height * 0.25}
            r={5}
            color="rgba(112,84,246,0.18)"
          />

          <Circle
            cx={width * 0.90}
            cy={height * 0.33}
            r={7}
            color="rgba(245,189,63,0.18)"
          />

          <Circle
            cx={width * 0.12}
            cy={height * 0.57}
            r={4}
            color="rgba(32,201,138,0.20)"
          />

          <Circle
            cx={width * 0.80}
            cy={height * 0.73}
            r={5}
            color="rgba(112,84,246,0.14)"
          />
        </Canvas>

        {/* ======================================================
          SCROLLABLE CONTENT
      ====================================================== */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: height,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces
        >
          <View style={styles.content}>
            {/* ==================================================
              TITLE
          ================================================== */}

            <View style={styles.header}>
              <View style={styles.titlePill}>
                <View style={styles.titleIcon}>
                  <Ionicons
                    name="headset-outline"
                    size={19}
                    color={COLORS.purple}
                  />
                </View>

                <Text style={styles.titleText}>
                  LISTENING
                </Text>
              </View>

              <Text
                style={[
                  styles.promptText,
                  {
                    fontSize: 26 * scale,
                    lineHeight: 33 * scale,
                  },
                ]}
              >
                {question.prompt ||
                  "Listen and type what you hear."}
              </Text>

              <Text style={styles.instructionText}>
                Listen carefully and choose the
                correct answer
              </Text>
            </View>

            {/* ==================================================
              AUDIO PLAYER
          ================================================== */}

            <View style={styles.audioSection}>
              {/* Main speaker */}

              <Animated.View
                style={{
                  transform: [
                    {
                      scale: scaleAnim,
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.82}
                  disabled={disabled}
                  onPress={() =>
                    handleSpeak(0.9, false)
                  }
                  style={[
                    styles.mainSpeaker,
                    isSpeaking &&
                    styles.mainSpeakerPlaying,
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={styles.speakerHighlight}
                  />

                  <View style={styles.speakerIconCircle}>
                    <Ionicons
                      name={
                        isSpeaking
                          ? "volume-high"
                          : "volume-medium"
                      }
                      size={37}
                      color={COLORS.purple}
                    />
                  </View>

                  <Text style={styles.listenText}>
                    {isSpeaking
                      ? "Playing..."
                      : "Listen"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Slow speaker */}

              <Animated.View
                style={{
                  transform: [
                    {
                      scale: slowScaleAnim,
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.80}
                  disabled={disabled}
                  onPress={() =>
                    handleSpeak(0.5, true)
                  }
                  style={styles.slowSpeaker}
                >
                  <Text style={styles.turtleEmoji}>
                    🐢
                  </Text>

                  <Text style={styles.slowText}>
                    Slow
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* ==================================================
              OPTIONS
          ================================================== */}

            {hasOptions ? (
              <View style={styles.optionsSection}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Choose the answer
                    </Text>

                    <Text
                      style={styles.sectionSubtitle}
                    >
                      Select what you hear
                    </Text>
                  </View>

                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {question.options.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.optionsList}>
                  {question.options.map(
                    (option, index) => {
                      const isSelected =
                        selectedOptionId ===
                        option.id;

                      const showCorrect =
                        isChecked &&
                        isSelected &&
                        isCorrect;

                      const showWrong =
                        isChecked &&
                        isSelected &&
                        !isCorrect;

                      return (
                        <TouchableOpacity
                          key={option.id}
                          activeOpacity={0.82}
                          disabled={disabled}
                          onPress={() => {
                            if (!disabled) {
                              onSelect(
                                option.id
                              );
                            }
                          }}
                          style={[
                            styles.optionCard,

                            isSelected &&
                            styles.optionSelected,

                            showCorrect &&
                            styles.optionCorrect,

                            showWrong &&
                            styles.optionWrong,
                          ]}
                        >
                          {/* Glass overlay */}

                          <View
                            pointerEvents="none"
                            style={
                              styles.optionOverlay
                            }
                          />

                          {/* Top highlight */}

                          <View
                            pointerEvents="none"
                            style={
                              styles.optionHighlight
                            }
                          />

                          {/* Radio */}

                          <View
                            style={[
                              styles.radio,

                              isSelected &&
                              styles.radioSelected,

                              showCorrect &&
                              styles.radioCorrect,

                              showWrong &&
                              styles.radioWrong,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons
                                name={
                                  showWrong
                                    ? "close"
                                    : "checkmark"
                                }
                                size={15}
                                color={
                                  COLORS.white
                                }
                              />
                            )}
                          </View>

                          {/* Text */}

                          <Text
                            style={[
                              styles.optionText,

                              isSelected &&
                              styles.optionTextSelected,

                              showWrong &&
                              styles.optionTextWrong,

                              showCorrect &&
                              styles.optionTextCorrect,
                            ]}
                          >
                            {option.text}
                          </Text>

                          {/* Result icon */}

                          {isChecked &&
                            isSelected && (
                              <View
                                style={[
                                  styles.resultIcon,

                                  showCorrect &&
                                  styles.resultCorrect,

                                  showWrong &&
                                  styles.resultWrong,
                                ]}
                              >
                                <Ionicons
                                  name={
                                    showCorrect
                                      ? "checkmark"
                                      : "close"
                                  }
                                  size={15}
                                  color={
                                    COLORS.white
                                  }
                                />
                              </View>
                            )}
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              </View>
            ) : (
              /* ==================================================
                 FREE INPUT
              ================================================== */

              <View style={styles.freeInputSection}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Type what you hear
                    </Text>

                    <Text
                      style={styles.sectionSubtitle}
                    >
                      Write the sentence exactly
                    </Text>
                  </View>

                  <View
                    style={styles.inputMicBadge}
                  >
                    <Ionicons
                      name="mic-outline"
                      size={17}
                      color={COLORS.purple}
                    />
                  </View>
                </View>

                {/* =================================================
                  GLASS INPUT

                  NO native white background
              ================================================= */}

                <View
                  style={[
                    styles.inputGlass,

                    isFocused &&
                    styles.inputGlassFocused,

                    isChecked &&
                    isCorrect &&
                    styles.inputGlassCorrect,

                    isChecked &&
                    !isCorrect &&
                    styles.inputGlassWrong,
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={styles.inputGlassOverlay}
                  />

                  <View
                    pointerEvents="none"
                    style={styles.inputGlassHighlight}
                  />

                  <TextInput
                    value={typedAnswer}
                    onChangeText={
                      onChangeTyped
                    }
                    placeholder="Type what you hear..."
                    placeholderTextColor="rgba(90,86,110,0.58)"
                    editable={
                      !disabled &&
                      !isChecked
                    }
                    multiline
                    numberOfLines={3}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlignVertical="top"
                    underlineColorAndroid="transparent"
                    selectionColor={
                      COLORS.purple
                    }
                    cursorColor={
                      COLORS.purple
                    }
                    includeFontPadding={false}
                    style={[
                      styles.textInputField,

                      isChecked &&
                      isCorrect &&
                      styles.textInputCorrect,

                      isChecked &&
                      !isCorrect &&
                      styles.textInputWrong,
                    ]}
                    onFocus={() =>
                      setIsFocused(true)
                    }
                    onBlur={() =>
                      setIsFocused(false)
                    }
                  />

                  {/* Clear */}

                  {typedAnswer.length > 0 &&
                    !disabled &&
                    !isChecked && (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        style={styles.clearButton}
                        onPress={() =>
                          onChangeTyped?.(
                            ""
                          )
                        }
                        hitSlop={{
                          top: 10,
                          bottom: 10,
                          left: 10,
                          right: 10,
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={22}
                          color="rgba(90,86,110,0.52)"
                        />
                      </TouchableOpacity>
                    )}

                  {/* Result */}

                  {isChecked && (
                    <View
                      style={[
                        styles.inputResult,
                        isCorrect
                          ? styles.inputResultCorrect
                          : styles.inputResultWrong,
                      ]}
                    >
                      <Ionicons
                        name={
                          isCorrect
                            ? "checkmark"
                            : "close"
                        }
                        size={16}
                        color={COLORS.white}
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  /* ==========================================================
     ROOT
  ========================================================== */

  container: {
    flex: 1,

    width: "100%",

    backgroundColor: "#F2EFFF",

    overflow: "hidden",
  },

  scrollView: {
    flex: 1,

    width: "100%",
  },

  scrollContent: {
    flexGrow: 1,

    paddingBottom: 30,
  },

  content: {
    width: "100%",

    paddingHorizontal: 16,

    paddingTop: 18,

    paddingBottom: 25,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    width: "100%",

    alignItems: "center",
  },

  titlePill: {
    minHeight: 58,

    paddingHorizontal: 24,

    borderRadius: 30,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.075)",

    borderWidth: 1.4,

    borderColor:
      "rgba(255,255,255,0.80)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.04,

    shadowRadius: 14,

    elevation: 0,
  },

  titleIcon: {
    width: 36,

    height: 36,

    borderRadius: 18,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.09)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.70)",

    marginRight: 10,
  },

  titleText: {
    fontSize: 14,

    fontWeight: "900",

    letterSpacing: 0.7,

    color: COLORS.purple,
  },

  promptText: {
    color: COLORS.text,

    fontWeight: "900",

    textAlign: "center",

    marginTop: 24,

    marginBottom: 6,

    paddingHorizontal: 8,

    letterSpacing: -0.7,
  },

  instructionText: {
    color: COLORS.muted,

    fontSize: 14,

    lineHeight: 20,

    fontWeight: "700",

    textAlign: "center",

    paddingHorizontal: 10,
  },

  /* ==========================================================
     AUDIO
  ========================================================== */

  audioSection: {
    width: "100%",

    height: 155,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 16,
  },

  mainSpeaker: {
    width: 112,

    height: 112,

    borderRadius: 56,

    alignItems: "center",

    justifyContent: "center",

    position: "relative",

    overflow: "hidden",

    backgroundColor:
      "rgba(255,255,255,0.075)",

    borderWidth: 1.8,

    borderColor:
      "rgba(255,255,255,0.82)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,

      height: 7,
    },

    shadowOpacity: 0.08,

    shadowRadius: 17,

    elevation: 1,
  },

  mainSpeakerPlaying: {
    backgroundColor:
      "rgba(112,84,246,0.10)",

    borderColor:
      "rgba(112,84,246,0.58)",
  },

  speakerHighlight: {
    position: "absolute",

    top: 4,

    left: 17,

    right: 17,

    height: 1.4,

    backgroundColor:
      "rgba(255,255,255,0.80)",
  },

  speakerIconCircle: {
    width: 61,

    height: 61,

    borderRadius: 31,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.09)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.68)",
  },

  listenText: {
    color: COLORS.purple,

    fontSize: 12,

    fontWeight: "900",

    marginTop: 5,

    letterSpacing: 0.2,
  },

  slowSpeaker: {
    width: 68,

    height: 68,

    borderRadius: 34,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.065)",

    borderWidth: 1.4,

    borderColor:
      "rgba(255,255,255,0.76)",

    shadowColor: COLORS.purple,

    shadowOpacity: 0.04,

    shadowRadius: 9,

    shadowOffset: {
      width: 0,

      height: 3,
    },

    elevation: 0,
  },

  turtleEmoji: {
    fontSize: 27,
  },

  slowText: {
    color: COLORS.muted,

    fontSize: 10,

    fontWeight: "800",

    marginTop: 1,
  },

  /* ==========================================================
     OPTIONS
  ========================================================== */

  optionsSection: {
    width: "100%",
  },

  sectionHeader: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 10,
  },

  sectionTitle: {
    color: COLORS.text,

    fontSize: 18,

    lineHeight: 23,

    fontWeight: "900",
  },

  sectionSubtitle: {
    color: COLORS.muted,

    fontSize: 11,

    lineHeight: 16,

    fontWeight: "700",

    marginTop: 1,
  },

  countBadge: {
    width: 31,

    height: 31,

    borderRadius: 16,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(112,84,246,0.075)",

    borderWidth: 1,

    borderColor:
      "rgba(112,84,246,0.18)",
  },

  countText: {
    color: COLORS.purple,

    fontSize: 12,

    fontWeight: "900",
  },

  optionsList: {
    width: "100%",

    gap: 10,
  },

  optionCard: {
    width: "100%",

    minHeight: 62,

    borderRadius: 19,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 14,

    paddingVertical: 10,

    position: "relative",

    overflow: "hidden",

    backgroundColor:
      "rgba(255,255,255,0.055)",

    borderWidth: 1.5,

    borderColor:
      "rgba(255,255,255,0.72)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,

      height: 3,
    },

    shadowOpacity: 0.025,

    shadowRadius: 8,

    elevation: 0,
  },

  optionSelected: {
    backgroundColor:
      "rgba(112,84,246,0.085)",

    borderColor:
      "rgba(112,84,246,0.52)",
  },

  optionCorrect: {
    backgroundColor:
      "rgba(32,201,138,0.075)",

    borderColor:
      "rgba(32,201,138,0.68)",
  },

  optionWrong: {
    backgroundColor:
      "rgba(239,100,111,0.075)",

    borderColor:
      "rgba(239,100,111,0.68)",
  },

  optionOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.018)",
  },

  optionHighlight: {
    position: "absolute",

    top: 1,

    left: 16,

    right: 16,

    height: 1,

    backgroundColor:
      "rgba(255,255,255,0.72)",
  },

  /* ==========================================================
     RADIO
  ========================================================== */

  radio: {
    width: 27,

    height: 27,

    borderRadius: 14,

    borderWidth: 1.8,

    borderColor:
      "rgba(110,106,128,0.35)",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 13,

    backgroundColor:
      "rgba(255,255,255,0.025)",
  },

  radioSelected: {
    borderColor: COLORS.purple,

    backgroundColor: COLORS.purple,
  },

  radioCorrect: {
    borderColor: COLORS.green,

    backgroundColor: COLORS.green,
  },

  radioWrong: {
    borderColor: COLORS.red,

    backgroundColor: COLORS.red,
  },

  /* ==========================================================
     OPTION TEXT
  ========================================================== */

  optionText: {
    flex: 1,

    color: COLORS.text,

    fontSize: 17,

    lineHeight: 23,

    fontWeight: "800",

    backgroundColor: "transparent",
  },

  optionTextSelected: {
    color: COLORS.purpleDark,

    fontWeight: "900",
  },

  optionTextCorrect: {
    color: COLORS.greenDark,
  },

  optionTextWrong: {
    color: COLORS.redDark,
  },

  /* ==========================================================
     RESULT
  ========================================================== */

  resultIcon: {
    width: 27,

    height: 27,

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    marginLeft: 8,

    borderWidth: 1.2,

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  resultCorrect: {
    backgroundColor: COLORS.green,
  },

  resultWrong: {
    backgroundColor: COLORS.red,
  },

  /* ==========================================================
     FREE INPUT
  ========================================================== */

  freeInputSection: {
    width: "100%",
  },

  inputMicBadge: {
    width: 32,

    height: 32,

    borderRadius: 16,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(112,84,246,0.075)",

    borderWidth: 1,

    borderColor:
      "rgba(112,84,246,0.18)",
  },

  /* ==========================================================
     GLASS TEXT INPUT

     IMPORTANT:
     TextInput itself has NO background.
  ========================================================== */

  inputGlass: {
    width: "100%",

    minHeight: 128,

    borderRadius: 23,

    paddingHorizontal: 16,

    paddingVertical: 14,

    position: "relative",

    overflow: "hidden",

    backgroundColor:
      "rgba(255,255,255,0.055)",

    borderWidth: 1.7,

    borderColor:
      "rgba(255,255,255,0.78)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,

      height: 5,
    },

    shadowOpacity: 0.035,

    shadowRadius: 12,

    elevation: 0,
  },

  inputGlassFocused: {
    backgroundColor:
      "rgba(112,84,246,0.065)",

    borderColor:
      "rgba(112,84,246,0.65)",
  },

  inputGlassCorrect: {
    backgroundColor:
      "rgba(32,201,138,0.07)",

    borderColor:
      "rgba(32,201,138,0.70)",
  },

  inputGlassWrong: {
    backgroundColor:
      "rgba(239,100,111,0.07)",

    borderColor:
      "rgba(239,100,111,0.70)",
  },

  inputGlassOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.018)",
  },

  inputGlassHighlight: {
    position: "absolute",

    top: 1,

    left: 20,

    right: 20,

    height: 1.2,

    backgroundColor:
      "rgba(255,255,255,0.76)",
  },

  textInputField: {
    width: "100%",

    minHeight: 96,

    padding: 0,

    margin: 0,

    borderWidth: 0,

    borderColor: "transparent",

    backgroundColor: "transparent",

    color: COLORS.text,

    fontSize: 19,

    lineHeight: 27,

    fontWeight: "800",

    textAlignVertical: "top",

    includeFontPadding: false,

    elevation: 0,

    shadowColor: "transparent",

    shadowOpacity: 0,

    shadowRadius: 0,

    shadowOffset: {
      width: 0,

      height: 0,
    },
  },

  textInputCorrect: {
    color: COLORS.greenDark,
  },

  textInputWrong: {
    color: COLORS.redDark,
  },

  clearButton: {
    position: "absolute",

    right: 14,

    bottom: 12,

    width: 28,

    height: 28,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.10)",

    borderRadius: 14,
  },

  inputResult: {
    position: "absolute",

    right: 13,

    top: 13,

    width: 27,

    height: 27,

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1.2,

    borderColor:
      "rgba(255,255,255,0.85)",
  },

  inputResultCorrect: {
    backgroundColor: COLORS.green,
  },

  inputResultWrong: {
    backgroundColor: COLORS.red,
  },
});

export default ListeningQuestion;