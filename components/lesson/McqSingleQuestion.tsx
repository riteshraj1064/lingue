// components/lesson/McqSingleQuestion.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
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

import { McqSingleQuestionData } from "./types";

interface McqSingleQuestionProps {
  question: McqSingleQuestionData;
  selectedOptionId: string | null;
  onSelect: (id: string) => void;
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

  gold: "#F5B52F",

  white: "#FFFFFF",
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

export const McqSingleQuestion: React.FC<
  McqSingleQuestionProps
> = ({
  question,
  selectedOptionId,
  onSelect,
  isChecked = false,
  isCorrect = false,
  disabled = false,
}) => {
    const { width, height } = useWindowDimensions();

    const scale = Math.min(
      Math.max(width / 390, 0.9),
      1.08
    );

    /* ==========================================================
       ANIMATION
    ========================================================== */

    const questionOpacity = useSharedValue(0);
    const questionY = useSharedValue(20);

    const optionsOpacity = useSharedValue(0);
    const optionsY = useSharedValue(24);

    useEffect(() => {
      questionOpacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });

      questionY.value = withTiming(0, {
        duration: 550,
        easing: Easing.out(Easing.cubic),
      });

      optionsOpacity.value = withTiming(1, {
        duration: 550,
        easing: Easing.out(Easing.cubic),
      });

      optionsY.value = withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    }, [question.id]);

    const questionAnimatedStyle = useAnimatedStyle(() => ({
      opacity: questionOpacity.value,
      transform: [
        {
          translateY: questionY.value,
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

    const hasInstruction = Boolean(
      question.instruction &&
      question.instruction !== question.prompt
    );

    return (
      <View style={styles.container}>
        {/* ======================================================
          SKIA BACKGROUND
      ====================================================== */}

        <Canvas
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* Base */}

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
                "#F2EFFF",
                "#EEEAFE",
                "#F8F7FF",
                "#ECF9F5",
              ]}
            />
          </Rect>

          {/* Large purple blob */}

          <Circle
            cx={width * 0.92}
            cy={height * 0.15}
            r={width * 0.5}
            color="rgba(112,84,246,0.14)"
          />

          {/* Cyan blob */}

          <Circle
            cx={-width * 0.05}
            cy={height * 0.75}
            r={width * 0.48}
            color="rgba(44,205,220,0.12)"
          />

          {/* Bottom purple */}

          <Circle
            cx={width * 0.78}
            cy={height * 0.92}
            r={width * 0.4}
            color="rgba(112,84,246,0.08)"
          />

          {/* Center light */}

          <Circle
            cx={width * 0.48}
            cy={height * 0.48}
            r={width * 0.36}
            color="rgba(255,255,255,0.28)"
          />

          {/* Decorative dots */}

          <Circle
            cx={width * 0.1}
            cy={height * 0.28}
            r={5}
            color="rgba(112,84,246,0.22)"
          />

          <Circle
            cx={width * 0.91}
            cy={height * 0.39}
            r={8}
            color="rgba(245,181,47,0.22)"
          />

          <Circle
            cx={width * 0.14}
            cy={height * 0.56}
            r={4}
            color="rgba(32,201,138,0.25)"
          />
        </Canvas>

        {/* ======================================================
          QUESTION CONTENT
      ====================================================== */}

        <View style={styles.content}>
          {/* ====================================================
            QUESTION HEADER
        ==================================================== */}

          <Animated.View
            style={[
              styles.questionArea,
              questionAnimatedStyle,
            ]}
          >
            {/* Question type glass pill */}

            <View style={styles.questionLabel}>
              <View style={styles.questionLabelIcon}>
                <Ionicons
                  name="sparkles"
                  size={14}
                  color={COLORS.purple}
                />
              </View>

              <Text style={styles.questionLabelText}>
                CHOOSE THE CORRECT ANSWER
              </Text>
            </View>

            {/* Main question */}

            <Text
              style={[
                styles.prompt,
                {
                  fontSize: hasInstruction
                    ? 22 * scale
                    : 28 * scale,

                  lineHeight: hasInstruction
                    ? 30 * scale
                    : 36 * scale,
                },
              ]}
            >
              {question.prompt}
            </Text>

            {/* Instruction */}

            {hasInstruction && (
              <Text style={styles.instruction}>
                {question.instruction}
              </Text>
            )}

            {/* Audio */}

            {question.audioPromptText && (
              <GlassAudioButton disabled={disabled} />
            )}
          </Animated.View>

          {/* ====================================================
            OPTIONS
        ==================================================== */}

          <Animated.View
            style={[
              styles.options,
              optionsAnimatedStyle,
            ]}
          >
            {question.options.map((option, index) => {
              const isSelected =
                selectedOptionId === option.id;

              const isCorrectAnswer =
                option.id === question.correctAnswerId;

              let state:
                | "normal"
                | "selected"
                | "correct"
                | "wrong" = "normal";

              /*
               * BEFORE CHECK
               */

              if (!isChecked) {
                if (isSelected) {
                  state = "selected";
                }
              }

              /*
               * AFTER CHECK
               */

              if (isChecked) {
                if (isSelected && isCorrect) {
                  state = "correct";
                } else if (
                  isSelected &&
                  !isCorrect
                ) {
                  state = "wrong";
                }

                /*
                 * Keep existing behavior:
                 * only expose correct answer
                 * when submitted answer is correct.
                 */

                if (
                  isCorrect &&
                  isCorrectAnswer
                ) {
                  state = "correct";
                }
              }

              return (
                <GlassOption
                  key={option.id}
                  text={option.text}
                  index={index}
                  state={state}
                  disabled={disabled}
                  onPress={() =>
                    onSelect(option.id)
                  }
                />
              );
            })}
          </Animated.View>
        </View>
      </View>
    );
  };

/* ============================================================
   GLASS OPTION
============================================================ */

interface GlassOptionProps {
  text: string;
  index: number;

  state:
  | "normal"
  | "selected"
  | "correct"
  | "wrong";

  disabled: boolean;

  onPress: () => void;
}

const GlassOption: React.FC<
  GlassOptionProps
> = ({
  text,
  index,
  state,
  disabled,
  onPress,
}) => {
    const scale = useSharedValue(1);

    const animatedStyle =
      useAnimatedStyle(() => ({
        transform: [
          {
            scale: scale.value,
          },
        ],
      }));

    const isSelected =
      state === "selected";

    const isCorrect =
      state === "correct";

    const isWrong =
      state === "wrong";

    const handlePressIn = () => {
      if (disabled) return;

      scale.value = withTiming(0.975, {
        duration: 80,
      });
    };

    const handlePressOut = () => {
      scale.value = withTiming(1, {
        duration: 140,
      });
    };

    const handlePress = () => {
      if (disabled) return;

      onPress();
    };

    return (
      <Animated.View
        style={[
          styles.optionWrapper,
          animatedStyle,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={styles.option}
        >
          {/* ==================================================
            STATE TINT
        ================================================== */}

          {isSelected && (
            <View
              pointerEvents="none"
              style={styles.selectedTint}
            />
          )}

          {isCorrect && (
            <View
              pointerEvents="none"
              style={styles.correctTint}
            />
          )}

          {isWrong && (
            <View
              pointerEvents="none"
              style={styles.wrongTint}
            />
          )}

          {/* ==================================================
            OPTION CONTENT
        ================================================== */}

          <View style={styles.optionContent}>
            {/* Letter */}

            <View
              style={[
                styles.optionLetter,

                isSelected &&
                styles.optionLetterSelected,

                isCorrect &&
                styles.optionLetterCorrect,

                isWrong &&
                styles.optionLetterWrong,
              ]}
            >
              {isCorrect ? (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={COLORS.white}
                />
              ) : isWrong ? (
                <Ionicons
                  name="close"
                  size={18}
                  color={COLORS.white}
                />
              ) : (
                <Text
                  style={[
                    styles.letterText,

                    isSelected &&
                    styles.letterTextSelected,
                  ]}
                >
                  {String.fromCharCode(
                    65 + index
                  )}
                </Text>
              )}
            </View>

            {/* Answer */}

            <Text
              style={[
                styles.optionText,

                isSelected &&
                styles.optionTextSelected,

                isCorrect &&
                styles.optionTextCorrect,

                isWrong &&
                styles.optionTextWrong,
              ]}
            >
              {text}
            </Text>

            {/* ==================================================
              RADIO / STATUS
          ================================================== */}

            {!isSelected &&
              !isCorrect &&
              !isWrong && (
                <View
                  style={styles.radioOuter}
                />
              )}

            {isSelected && (
              <View
                style={styles.radioSelected}
              >
                <View
                  style={
                    styles.radioSelectedDot
                  }
                />
              </View>
            )}

            {isCorrect && (
              <View
                style={styles.statusCorrect}
              >
                <Ionicons
                  name="checkmark"
                  size={17}
                  color={COLORS.white}
                />
              </View>
            )}

            {isWrong && (
              <View
                style={styles.statusWrong}
              >
                <Ionicons
                  name="close"
                  size={17}
                  color={COLORS.white}
                />
              </View>
            )}
          </View>

          {/* ==================================================
            GLASS BORDER
        ================================================== */}

          <View
            pointerEvents="none"
            style={[
              styles.optionBorder,

              isSelected &&
              styles.optionBorderSelected,

              isCorrect &&
              styles.optionBorderCorrect,

              isWrong &&
              styles.optionBorderWrong,
            ]}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

/* ============================================================
   AUDIO BUTTON
============================================================ */

const GlassAudioButton = ({
  disabled,
}: {
  disabled: boolean;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle =
    useAnimatedStyle(() => ({
      transform: [
        {
          scale: scale.value,
        },
      ],
    }));

  const handlePressIn = () => {
    if (disabled) return;

    scale.value = withTiming(0.94, {
      duration: 80,
    });
  };

  const handlePressOut = () => {
    scale.value = withSequence(
      withTiming(1.04, {
        duration: 100,
      }),
      withTiming(1, {
        duration: 100,
      })
    );
  };

  const handlePress = () => {
    if (disabled) return;

    /*
     * Keep your existing audio implementation here.
     */
  };

  return (
    <Animated.View
      style={animatedStyle}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={styles.audioButton}
      >
        <View style={styles.audioIcon}>
          <Ionicons
            name="volume-high"
            size={22}
            color={COLORS.purple}
          />
        </View>

        <Text style={styles.audioText}>
          Listen
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2EFFF",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },

  /* ==========================================================
     QUESTION
  ========================================================== */

  questionArea: {
    alignItems: "center",
    paddingHorizontal: 5,
  },

  questionLabel: {
    height: 60,
    paddingHorizontal: 20,
    borderRadius: 30,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 9,

    backgroundColor:
      "rgba(255,255,255,0.12)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.72)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.04,
    shadowRadius: 15,

    elevation: 2,
  },

  questionLabelIcon: {
    width: 34,
    height: 34,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(112,84,246,0.10)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.55)",
  },

  questionLabelText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: COLORS.purple,
  },

  prompt: {
    marginTop: 34,
    maxWidth: 360,
    fontWeight: "900",
    letterSpacing: -1.1,
    color: COLORS.text,
    textAlign: "center",
  },

  instruction: {
    marginTop: 9,
    maxWidth: 350,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
    color: COLORS.muted,
    textAlign: "center",
  },

  /* ==========================================================
     AUDIO
  ========================================================== */

  audioButton: {
    marginTop: 15,
    height: 48,

    paddingHorizontal: 16,

    borderRadius: 24,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 9,

    backgroundColor:
      "rgba(255,255,255,0.10)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.62)",

    shadowColor: COLORS.purple,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.05,
    shadowRadius: 14,

    elevation: 2,
  },

  audioIcon: {
    width: 31,
    height: 31,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.20)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.60)",
  },

  audioText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.purple,
  },

  /* ==========================================================
     OPTIONS
  ========================================================== */

  options: {
    width: "100%",
    marginTop: 34,
    gap: 14,
  },

  optionWrapper: {
    width: "100%",
    backgroundColor: "transparent",
  },

  /*
   * IMPORTANT:
   *
   * No background.
   * No elevation.
   * No shadow.
   *
   * TouchableOpacity is completely transparent.
   */

  option: {
    minHeight: 84,

    borderRadius: 25,

    overflow: "hidden",

    position: "relative",

    justifyContent: "center",

    backgroundColor: "transparent",

    shadowColor: "transparent",

    shadowOffset: {
      width: 0,
      height: 0,
    },

    shadowOpacity: 0,

    shadowRadius: 0,

    elevation: 0,
  },

  /* ==========================================================
     STATE COLORS
  ========================================================== */

  selectedTint: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(112,84,246,0.095)",
  },

  correctTint: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(32,201,138,0.085)",
  },

  wrongTint: {
    //@ts-ignore
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(239,100,111,0.085)",
  },

  /* ==========================================================
     CONTENT
  ========================================================== */

  optionContent: {
    minHeight: 84,

    paddingHorizontal: 16,

    flexDirection: "row",

    alignItems: "center",

    zIndex: 5,

    backgroundColor: "transparent",
  },

  /* ==========================================================
     LETTER
  ========================================================== */

  optionLetter: {
    width: 48,
    height: 48,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 15,

    backgroundColor:
      "rgba(255,255,255,0.035)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.60)",
  },

  optionLetterSelected: {
    backgroundColor:
      "rgba(112,84,246,0.78)",

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  optionLetterCorrect: {
    backgroundColor:
      "rgba(32,201,138,0.85)",

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  optionLetterWrong: {
    backgroundColor:
      "rgba(239,100,111,0.85)",

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  letterText: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.muted,
  },

  letterTextSelected: {
    color: COLORS.white,
  },

  /* ==========================================================
     ANSWER
  ========================================================== */

  optionText: {
    flex: 1,

    fontSize: 18,

    lineHeight: 25,

    fontWeight: "bold",

    color: COLORS.text,
  },

  optionTextSelected: {
    color: COLORS.purpleDark,
  },

  optionTextCorrect: {
    color: COLORS.greenDark,
  },

  optionTextWrong: {
    color: COLORS.redDark,
  },

  /* ==========================================================
     NORMAL RADIO
  ========================================================== */

  radioOuter: {
    width: 31,
    height: 31,

    borderRadius: 16,

    borderWidth: 2,

    borderColor:
      "rgba(255,255,255,0.78)",

    backgroundColor:
      "transparent",
  },

  /* ==========================================================
     SELECTED RADIO
  ========================================================== */

  radioSelected: {
    width: 31,
    height: 31,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(112,84,246,0.78)",

    borderWidth: 2,

    borderColor:
      "rgba(255,255,255,0.72)",
  },

  radioSelectedDot: {
    width: 10,
    height: 10,

    borderRadius: 5,

    backgroundColor:
      COLORS.white,
  },

  /* ==========================================================
     CORRECT
  ========================================================== */

  statusCorrect: {
    width: 31,
    height: 31,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(32,201,138,0.88)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  /* ==========================================================
     WRONG
  ========================================================== */

  statusWrong: {
    width: 31,
    height: 31,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(239,100,111,0.88)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  /* ==========================================================
     OPTION BORDER
  ========================================================== */
  optionBorder: {
    position: "absolute",

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    borderRadius: 25,

    borderWidth: 1.5,

    borderColor: "rgba(168, 212, 214, 0.72)",

    zIndex: 8,
  },

  optionBorderSelected: {
    borderWidth: 2,

    borderColor: "rgba(112,84,246,0.75)",
  },

  optionBorderCorrect: {
    borderWidth: 2,

    borderColor: "rgba(32,201,138,0.75)",
  },

  optionBorderWrong: {
    borderWidth: 2,

    borderColor: "rgba(239,100,111,0.75)",
  },
});

export default McqSingleQuestion;