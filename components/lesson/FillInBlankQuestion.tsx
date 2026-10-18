// components/lesson/FillInBlankQuestion.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";

import { useApp } from "@/context/AppContext";
import { FillInBlankQuestionData } from "./types";

/* ============================================================
   PROPS
============================================================ */

interface FillInBlankQuestionProps {
  question: FillInBlankQuestionData;

  selectedAnswer: string | null;
  onSelect: (word: string | null) => void;

  typedAnswer?: string;
  onChangeTyped?: (text: string) => void;

  isChecked?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

/* ============================================================
   COLORS
============================================================ */

const COLORS = {
  purple: "#7054F6",
  purpleDark: "#5137D8",

  text: "#17142B",
  muted: "#6E6A80",

  green: "#20C98A",
  greenDark: "#117553",

  red: "#EF646F",
  redDark: "#B43C47",

  white: "#FFFFFF",

  cyan: "#2CCDDC",
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

export const FillInBlankQuestion: React.FC<
  FillInBlankQuestionProps
> = ({
  question,
  selectedAnswer,
  onSelect,
  typedAnswer = "",
  onChangeTyped,
  isChecked = false,
  isCorrect = false,
  disabled = false,
}) => {
    const { width, height } = useWindowDimensions();
    const { selectedTargetLang } = useApp()

    /* ==========================================================
       RESPONSIVE SCALE
    ========================================================== */

    const scale = Math.min(
      Math.max(width / 390, 0.88),
      1.08
    );

    /* ==========================================================
       INPUT REF
    ========================================================== */

    const inputRef = useRef<TextInput>(null);

    /* ==========================================================
       MODE
    ========================================================== */

    const hasBankOptions =
      Array.isArray(question.options) &&
      question.options.length > 0;

    /* ==========================================================
       ANIMATIONS
    ========================================================== */

    const headerOpacity = useSharedValue(0);
    const headerY = useSharedValue(20);

    const characterOpacity = useSharedValue(0);
    const characterY = useSharedValue(20);

    const sentenceOpacity = useSharedValue(0);
    const sentenceY = useSharedValue(24);

    const optionsOpacity = useSharedValue(0);
    const optionsY = useSharedValue(24);

    useEffect(() => {
      headerOpacity.value = 0;
      headerY.value = 20;

      characterOpacity.value = 0;
      characterY.value = 20;

      sentenceOpacity.value = 0;
      sentenceY.value = 24;

      optionsOpacity.value = 0;
      optionsY.value = 24;

      headerOpacity.value = withTiming(1, {
        duration: 450,
        easing: Easing.out(Easing.cubic),
      });

      headerY.value = withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });

      characterOpacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });

      characterY.value = withTiming(0, {
        duration: 550,
        easing: Easing.out(Easing.cubic),
      });

      sentenceOpacity.value = withTiming(1, {
        duration: 550,
        easing: Easing.out(Easing.cubic),
      });

      sentenceY.value = withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });

      optionsOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });

      optionsY.value = withTiming(0, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
    }, [question]);

    const headerAnimatedStyle = useAnimatedStyle(() => ({
      opacity: headerOpacity.value,
      transform: [
        {
          translateY: headerY.value,
        },
      ],
    }));

    const characterAnimatedStyle = useAnimatedStyle(() => ({
      opacity: characterOpacity.value,
      transform: [
        {
          translateY: characterY.value,
        },
      ],
    }));

    const sentenceAnimatedStyle = useAnimatedStyle(() => ({
      opacity: sentenceOpacity.value,
      transform: [
        {
          translateY: sentenceY.value,
        },
      ],
    }));

    const optionsAnimatedStyle = useAnimatedStyle(() => ({
      opacity: optionsOpacity.value,
      transform: [
        {
          translateY: optionsY.value,
        },
      ],
    }));

    /* ==========================================================
       RENDER
    ========================================================== */

    return (
      <View
        style={[
          styles.container,
          {
            minHeight: height,
          },
        ]}
      >
        {/* ======================================================
          FULL SCREEN SKIA BACKGROUND
      ====================================================== */}

        <Canvas
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
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

          {/* Upper-right purple glow */}

          <Circle
            cx={width * 0.92}
            cy={height * 0.18}
            r={width * 0.55}
            color="rgba(112,84,246,0.14)"
          />

          {/* Left cyan glow */}

          <Circle
            cx={-width * 0.08}
            cy={height * 0.72}
            r={width * 0.48}
            color="rgba(44,205,220,0.10)"
          />

          {/* Bottom purple glow */}

          <Circle
            cx={width * 0.82}
            cy={height * 0.90}
            r={width * 0.43}
            color="rgba(112,84,246,0.08)"
          />

          {/* Center glow */}

          <Circle
            cx={width * 0.50}
            cy={height * 0.48}
            r={width * 0.40}
            color="rgba(255,255,255,0.25)"
          />

          {/* Decorative dots */}

          <Circle
            cx={width * 0.10}
            cy={height * 0.27}
            r={5}
            color="rgba(112,84,246,0.18)"
          />

          <Circle
            cx={width * 0.90}
            cy={height * 0.37}
            r={7}
            color="rgba(245,181,47,0.18)"
          />

          <Circle
            cx={width * 0.12}
            cy={height * 0.58}
            r={4}
            color="rgba(32,201,138,0.20)"
          />
        </Canvas>

        {/* ======================================================
          CONTENT
      ====================================================== */}

        <View style={styles.content}>
          {/* ====================================================
            HEADER
        ==================================================== */}

          <Animated.View
            style={[
              styles.header,
              headerAnimatedStyle,
            ]}
          >
            <View style={styles.titlePill}>
              <View style={styles.titleIcon}>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={COLORS.purple}
                />
              </View>

              <Text style={styles.titleText}>
                FILL IN THE BLANK
              </Text>
            </View>

            <Text
              style={[
                styles.prompt,
                {
                  fontSize: 27 * scale,
                  lineHeight: 34 * scale,
                },
              ]}
            >
              {question.prompt}
            </Text>

            <Text style={styles.instruction}>
              {hasBankOptions
                ? "Choose the correct word"
                : "Type the correct word"}
            </Text>
          </Animated.View>

          {/* ====================================================
            CHARACTER
        ==================================================== */}

          {question.characterSpeech ? (
            <Animated.View
              style={[
                styles.characterSection,
                characterAnimatedStyle,
              ]}
            >
              <View style={styles.characterGlass}>
                <View style={styles.characterCircle}>
                  <Text style={styles.characterEmoji}>
                    👦🏻
                  </Text>
                </View>
              </View>

              <View style={styles.speechBubble}>
                <Text style={styles.speechText}>
                  {question.characterSpeech}
                </Text>

                <View style={styles.speechArrow} />
              </View>
            </Animated.View>
          ) : null}

          {/* ====================================================
            SENTENCE CARD
        ==================================================== */}

          <Animated.View
            style={[
              styles.sentenceCard,
              sentenceAnimatedStyle,
            ]}
          >
            <View style={styles.sentenceContent}>
              {question.sentenceBefore ? (
                <Text
                  style={[
                    styles.sentenceText,
                    {
                      fontSize: 20 * scale,
                      lineHeight: 29 * scale,
                    },
                  ]}
                >
                  {question.sentenceBefore}{" "}
                </Text>
              ) : null}

              {/* ==================================================
                CHIP MODE
            ================================================== */}

              {hasBankOptions ? (
                <BlankChip
                  value={selectedAnswer}
                  isChecked={isChecked}
                  isCorrect={isCorrect}
                  disabled={disabled}
                  scale={scale}
                  onPress={() => {
                    if (disabled) return;

                    if (selectedAnswer) {
                      onSelect(null);
                    }
                  }}
                />
              ) : (
                /* ==================================================
                   FREE TYPE MODE
                ================================================== */

                <TouchableOpacity
                  activeOpacity={1}
                  disabled={disabled}
                  onPress={() => {
                    if (!disabled) {
                      inputRef.current?.focus();
                    }
                  }}
                  style={[
                    styles.inputGlass,

                    typedAnswer.length > 0 &&
                    styles.inputGlassFilled,

                    isChecked &&
                    isCorrect &&
                    styles.inputGlassCorrect,

                    isChecked &&
                    !isCorrect &&
                    styles.inputGlassWrong,
                  ]}
                >
                  <TextInput
                    ref={inputRef}
                    value={typedAnswer}
                    onChangeText={(text) => {
                      if (!disabled) {
                        onChangeTyped?.(text);
                      }
                    }}
                    placeholder="Type your answer..."
                    placeholderTextColor="rgba(90,86,110,0.62)"
                    editable={!disabled}
                    autoCorrect={false}
                    autoCapitalize="none"
                    autoComplete="off"
                    returnKeyType="done"
                    textAlign="center"
                    textAlignVertical="center"
                    underlineColorAndroid="transparent"
                    selectionColor={COLORS.purple}
                    cursorColor={COLORS.purple}
                    multiline={false}
                    numberOfLines={1}
                    style={[
                      styles.inputText,
                      {
                        fontSize: 21 * scale,
                        lineHeight: 27 * scale,
                      },

                      isChecked &&
                      isCorrect &&
                      styles.inputTextCorrect,

                      isChecked &&
                      !isCorrect &&
                      styles.inputTextWrong,
                    ]}
                  />

                  {isChecked && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.inputStatus,
                        isCorrect
                          ? styles.inputStatusCorrect
                          : styles.inputStatusWrong,
                      ]}
                    >
                      <Ionicons
                        name={
                          isCorrect
                            ? "checkmark"
                            : "close"
                        }
                        size={14}
                        color={COLORS.white}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {question.sentenceAfter ? (
                <Text
                  style={[
                    styles.sentenceText,
                    {
                      fontSize: 20 * scale,
                      lineHeight: 29 * scale,
                    },
                  ]}
                >
                  {" "}
                  {question.sentenceAfter}
                </Text>
              ) : null}
            </View>
          </Animated.View>

          {/* ====================================================
            WORD BANK
        ==================================================== */}

          {hasBankOptions ? (
            <Animated.View
              style={[
                styles.wordBank,
                optionsAnimatedStyle,
              ]}
            >
              {question.options.map(
                (word, index) => {
                  const selected =
                    selectedAnswer === word;

                  return (
                    <WordChip
                      key={`${word}-${index}`}
                      word={word}
                      selected={selected}
                      disabled={disabled}
                      scale={scale}
                      onPress={() => {
                        if (disabled) return;

                        onSelect(
                          selected ? null : word
                        );
                      }}
                    />
                  );
                }
              )}
            </Animated.View>
          ) : (
            /* ====================================================
               FREE TYPE AREA
            ==================================================== */

            <Animated.View
              style={[
                styles.freeTypeArea,
                optionsAnimatedStyle,
              ]}
            >
              <View style={styles.helper}>
                <View style={styles.helperIcon}>
                  <Ionicons
                    name="information-circle-outline"
                    size={17}
                    color={COLORS.purple}
                  />
                </View>

                <Text style={styles.helperText}>
                  Type your answer in {selectedTargetLang?.name}
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    );
  };

/* ============================================================
   BLANK CHIP
============================================================ */

interface BlankChipProps {
  value: string | null;
  isChecked: boolean;
  isCorrect: boolean;
  disabled: boolean;
  scale: number;
  onPress: () => void;
}

const BlankChip: React.FC<BlankChipProps> = ({
  value,
  isChecked,
  isCorrect,
  disabled,
  scale,
  onPress,
}) => {
  const selected = Boolean(value);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled || !selected}
      onPress={onPress}
      style={[
        styles.blankChip,

        selected &&
        styles.blankChipSelected,

        isChecked &&
        isCorrect &&
        styles.blankChipCorrect,

        isChecked &&
        !isCorrect &&
        styles.blankChipWrong,
      ]}
    >
      <Text
        style={[
          styles.blankChipText,
          {
            fontSize: 19 * scale,
          },

          selected &&
          styles.blankChipTextSelected,

          isChecked &&
          isCorrect &&
          styles.blankChipTextCorrect,

          isChecked &&
          !isCorrect &&
          styles.blankChipTextWrong,
        ]}
      >
        {value || "________"}
      </Text>

      {isChecked && (
        <View
          style={[
            styles.blankStatus,
            isCorrect
              ? styles.blankStatusCorrect
              : styles.blankStatusWrong,
          ]}
        >
          <Ionicons
            name={
              isCorrect
                ? "checkmark"
                : "close"
            }
            size={13}
            color={COLORS.white}
          />
        </View>
      )}

      <View
        pointerEvents="none"
        style={[
          styles.blankBorder,

          selected &&
          styles.blankBorderSelected,

          isChecked &&
          isCorrect &&
          styles.blankBorderCorrect,

          isChecked &&
          !isCorrect &&
          styles.blankBorderWrong,
        ]}
      />
    </TouchableOpacity>
  );
};

/* ============================================================
   WORD CHIP
============================================================ */

interface WordChipProps {
  word: string;
  selected: boolean;
  disabled: boolean;
  scale: number;
  onPress: () => void;
}

const WordChip: React.FC<WordChipProps> = ({
  word,
  selected,
  disabled,
  scale,
  onPress,
}) => {
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          scale: scaleValue.value,
        },
      ],
    })
  );

  const handlePressIn = () => {
    if (disabled || selected) return;

    scaleValue.value = withTiming(0.95, {
      duration: 80,
    });
  };

  const handlePressOut = () => {
    if (disabled || selected) return;

    scaleValue.value = withSequence(
      withTiming(1.03, {
        duration: 90,
      }),
      withTiming(1, {
        duration: 100,
      })
    );
  };

  return (
    <Animated.View
      style={[
        styles.wordChipWrapper,
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={disabled || selected}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.wordChip,
          selected &&
          styles.wordChipSelected,
        ]}
      >
        <Text
          style={[
            styles.wordChipText,
            {
              fontSize: 17 * scale,
            },
            selected &&
            styles.wordChipTextSelected,
          ]}
        >
          {word}
        </Text>

        {selected && (
          <View style={styles.chipCheck}>
            <Ionicons
              name="checkmark"
              size={13}
              color={COLORS.white}
            />
          </View>
        )}

        <View
          pointerEvents="none"
          style={[
            styles.wordChipBorder,
            selected &&
            styles.wordChipBorderSelected,
          ]}
        />
      </TouchableOpacity>
    </Animated.View>
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

    minHeight: "100%",

    backgroundColor: "#F2EFFF",

    overflow: "hidden",
  },

  content: {
    flex: 1,

    width: "100%",

    minHeight: "100%",

    paddingHorizontal: 20,

    paddingTop: 18,

    paddingBottom: 28,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    width: "100%",

    alignItems: "center",
  },

  titlePill: {
    height: 62,

    paddingHorizontal: 28,

    borderRadius: 32,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.12)",

    borderWidth: 1.3,

    borderColor:
      "rgba(255,255,255,0.78)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.05,

    shadowRadius: 16,

    elevation: 2,
  },

  titleIcon: {
    width: 38,

    height: 38,

    borderRadius: 19,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.16)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.68)",

    marginRight: 11,
  },

  titleText: {
    fontSize: 15,

    fontWeight: "900",

    letterSpacing: 0.7,

    color: COLORS.purple,
  },

  prompt: {
    marginTop: 32,

    maxWidth: 370,

    fontWeight: "900",

    letterSpacing: -1.1,

    color: COLORS.text,

    textAlign: "center",
  },

  instruction: {
    marginTop: 8,

    fontSize: 17,

    lineHeight: 24,

    fontWeight: "700",

    color: COLORS.muted,

    textAlign: "center",
  },

  /* ==========================================================
     CHARACTER
  ========================================================== */

  characterSection: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    marginTop: 20,

    marginBottom: 18,
  },

  characterGlass: {
    width: 70,

    height: 70,

    borderRadius: 23,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.13)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.75)",

    marginRight: 12,
  },

  characterCircle: {
    width: 56,

    height: 56,

    borderRadius: 28,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.22)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  characterEmoji: {
    fontSize: 34,
  },

  speechBubble: {
    flex: 1,

    minHeight: 66,

    paddingHorizontal: 17,

    paddingVertical: 12,

    justifyContent: "center",

    borderRadius: 20,

    backgroundColor:
      "rgba(255,255,255,0.13)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.76)",

    position: "relative",
  },

  speechText: {
    fontSize: 17,

    lineHeight: 23,

    fontWeight: "900",

    color: COLORS.purple,
  },

  speechArrow: {
    position: "absolute",

    left: -9,

    top: "50%",

    marginTop: -7,

    width: 0,

    height: 0,

    borderTopWidth: 7,

    borderTopColor: "transparent",

    borderBottomWidth: 7,

    borderBottomColor: "transparent",

    borderRightWidth: 9,

    borderRightColor:
      "rgba(255,255,255,0.76)",
  },

  /* ==========================================================
     SENTENCE CARD
  ========================================================== */

  sentenceCard: {
    width: "100%",

    minHeight: 150,

    paddingHorizontal: 18,

    paddingVertical: 24,

    borderRadius: 28,

    backgroundColor:
      "rgba(255,255,255,0.075)",

    borderWidth: 1.5,

    borderColor:
      "rgba(255,255,255,0.78)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.035,

    shadowRadius: 18,

    elevation: 0,

    justifyContent: "center",

    overflow: "visible",
  },

  sentenceContent: {
    width: "100%",

    minHeight: 90,

    flexDirection: "row",

    flexWrap: "wrap",

    alignItems: "center",

    justifyContent: "center",
  },

  sentenceText: {
    color: COLORS.text,

    fontWeight: "900",
  },

  /* ==========================================================
     FREE TYPE INPUT
  ========================================================== */

  inputGlass: {
    width: 250,

    height: 70,

    marginHorizontal: 6,

    borderRadius: 22,

    alignItems: "center",

    justifyContent: "center",

    /*
     * The glass background belongs to this wrapper.
     */
    backgroundColor:
      "rgba(255,255,255,0.055)",

    borderWidth: 2,

    borderColor:
      "rgba(120,215,215,0.55)",

    position: "relative",

    /*
     * Remove native Android visual effects.
     */
    elevation: 0,

    shadowColor: "transparent",

    shadowOpacity: 0,

    shadowRadius: 0,

    shadowOffset: {
      width: 0,
      height: 0,
    },

    overflow: "visible",
  },

  inputGlassFilled: {
    backgroundColor:
      "rgba(112,84,246,0.075)",

    borderColor:
      "rgba(112,84,246,0.65)",
  },

  inputGlassCorrect: {
    backgroundColor:
      "rgba(32,201,138,0.075)",

    borderColor:
      "rgba(32,201,138,0.75)",
  },

  inputGlassWrong: {
    backgroundColor:
      "rgba(239,100,111,0.075)",

    borderColor:
      "rgba(239,100,111,0.75)",
  },

  /*
   * IMPORTANT:
   *
   * Android TextInput itself has no visible background.
   * The parent inputGlass is the only glass surface.
   */

  inputText: {
    width: "100%",

    height: 66,

    margin: 0,

    paddingHorizontal: 14,

    paddingVertical: 0,

    backgroundColor: "transparent",

    borderWidth: 0,

    borderColor: "transparent",

    borderRadius: 0,

    elevation: 0,

    shadowColor: "transparent",

    shadowOpacity: 0,

    shadowRadius: 0,

    shadowOffset: {
      width: 0,
      height: 0,
    },

    color: COLORS.text,

    fontWeight: "900",

    textAlign: "center",

    textAlignVertical: "center",

    includeFontPadding: false,

    overflow: "hidden",
  },

  inputTextCorrect: {
    color: COLORS.greenDark,
  },

  inputTextWrong: {
    color: COLORS.redDark,
  },

  inputStatus: {
    position: "absolute",

    right: -8,

    top: -8,

    width: 24,

    height: 24,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.9)",

    zIndex: 20,

    elevation: 3,
  },

  inputStatusCorrect: {
    backgroundColor: COLORS.green,
  },

  inputStatusWrong: {
    backgroundColor: COLORS.red,
  },

  /* ==========================================================
     CHIP BLANK
  ========================================================== */

  blankChip: {
    minWidth: 90,

    minHeight: 53,

    paddingHorizontal: 18,

    paddingVertical: 8,

    marginHorizontal: 5,

    borderRadius: 17,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.09)",

    position: "relative",

    overflow: "visible",
  },

  blankChipSelected: {
    backgroundColor:
      "rgba(112,84,246,0.11)",
  },

  blankChipCorrect: {
    backgroundColor:
      "rgba(32,201,138,0.10)",
  },

  blankChipWrong: {
    backgroundColor:
      "rgba(239,100,111,0.10)",
  },

  blankChipText: {
    fontWeight: "900",

    color: COLORS.muted,

    zIndex: 2,
  },

  blankChipTextSelected: {
    color: COLORS.purpleDark,
  },

  blankChipTextCorrect: {
    color: COLORS.greenDark,
  },

  blankChipTextWrong: {
    color: COLORS.redDark,
  },

  blankBorder: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    borderRadius: 17,

    borderWidth: 1.5,

    borderColor:
      "rgba(168,212,214,0.72)",
  },

  blankBorderSelected: {
    borderWidth: 2,

    borderColor:
      "rgba(112,84,246,0.76)",
  },

  blankBorderCorrect: {
    borderWidth: 2,

    borderColor:
      "rgba(32,201,138,0.76)",
  },

  blankBorderWrong: {
    borderWidth: 2,

    borderColor:
      "rgba(239,100,111,0.76)",
  },

  blankStatus: {
    position: "absolute",

    width: 22,

    height: 22,

    borderRadius: 11,

    right: -7,

    top: -7,

    alignItems: "center",

    justifyContent: "center",

    zIndex: 10,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.85)",
  },

  blankStatusCorrect: {
    backgroundColor: COLORS.green,
  },

  blankStatusWrong: {
    backgroundColor: COLORS.red,
  },

  /* ==========================================================
     WORD BANK
  ========================================================== */

  wordBank: {
    width: "100%",

    marginTop: 25,

    flexDirection: "row",

    flexWrap: "wrap",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 2,
  },

  wordChipWrapper: {
    marginHorizontal: 5,

    marginVertical: 6,
  },

  wordChip: {
    minHeight: 54,

    paddingHorizontal: 20,

    borderRadius: 18,

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",

    position: "relative",

    overflow: "hidden",

    backgroundColor:
      "rgba(255,255,255,0.075)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.035,

    shadowRadius: 12,

    elevation: 0,
  },

  wordChipSelected: {
    backgroundColor:
      "rgba(112,84,246,0.11)",
  },

  wordChipText: {
    fontWeight: "900",

    color: COLORS.text,

    zIndex: 2,
  },

  wordChipTextSelected: {
    color: COLORS.purpleDark,
  },

  chipCheck: {
    width: 21,

    height: 21,

    borderRadius: 11,

    marginLeft: 8,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(112,84,246,0.88)",
  },

  wordChipBorder: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    borderRadius: 18,

    borderWidth: 1.5,

    borderColor:
      "rgba(168,212,214,0.72)",
  },

  wordChipBorderSelected: {
    borderWidth: 2,

    borderColor:
      "rgba(112,84,246,0.76)",
  },

  /* ==========================================================
     FREE TYPE AREA
  ========================================================== */

  freeTypeArea: {
    flex: 1,

    width: "100%",

    alignItems: "center",

    justifyContent: "flex-start",

    paddingTop: 20,
  },

  helper: {
    minHeight: 43,

    paddingHorizontal: 15,

    borderRadius: 23,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.09)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.72)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.03,

    shadowRadius: 10,

    elevation: 0,
  },

  helperIcon: {
    width: 27,

    height: 27,

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(112,84,246,0.08)",

    marginRight: 8,
  },

  helperText: {
    fontSize: 13,

    fontWeight: "800",

    color: COLORS.muted,
  },
});

export default FillInBlankQuestion;