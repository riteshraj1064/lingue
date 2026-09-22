
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
  withTiming,
} from "react-native-reanimated";

import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";

import { McqMultiQuestionData } from "./types";

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
   PROPS
============================================================ */

interface McqMultiQuestionProps {
  question: McqMultiQuestionData;

  selectedOptionIds: string[];

  onToggle: (id: string) => void;

  isChecked?: boolean;

  isCorrect?: boolean;

  correctOptionIds?: string[];

  disabled?: boolean;
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export const McqMultiQuestion: React.FC<
  McqMultiQuestionProps
> = ({
  question,
  selectedOptionIds,
  onToggle,
  isChecked = false,
  isCorrect = false,
  correctOptionIds,
  disabled = false,
}) => {
    const { width, height } = useWindowDimensions();

    /*
     * Same responsive scaling used by McqSingleQuestion.
     */
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
    }, [question.prompt]);

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

    /* ==========================================================
       INSTRUCTION
    ========================================================== */

    const hasInstruction = Boolean(
      question.instruction &&
      question.instruction !== question.prompt
    );

    /* ==========================================================
       CORRECT ANSWERS
    ========================================================== */

    const effectiveCorrectIds = (
      correctOptionIds &&
        correctOptionIds.length > 0
        ? correctOptionIds
        : question.correctAnswerIds || []
    ).map(String);

    /* ==========================================================
       RENDER
    ========================================================== */

    return (
      <View style={styles.container}>
        {/* ======================================================
          SKIA BACKGROUND
      ====================================================== */}

        <Canvas
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* Base background */}

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

          {/* Purple top-right blob */}

          <Circle
            cx={width * 0.92}
            cy={height * 0.15}
            r={width * 0.5}
            color="rgba(112,84,246,0.14)"
          />

          {/* Cyan bottom-left blob */}

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
          CONTENT
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
                  name="checkmark-done"
                  size={14}
                  color={COLORS.purple}
                />
              </View>

              <Text style={styles.questionLabelText}>
                SELECT ALL THAT APPLY
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

            {/* Default multi-select instruction */}

            {!hasInstruction && (
              <Text style={styles.instruction}>
                Select all correct answers
              </Text>
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
                selectedOptionIds.includes(option.id);

              const isCorrectAnswer =
                effectiveCorrectIds.includes(
                  String(option.id)
                );

              let state:
                | "normal"
                | "selected"
                | "correct"
                | "wrong" = "normal";

              /* -----------------------------------------------
                 BEFORE CHECK
              ------------------------------------------------ */

              if (!isChecked) {
                if (isSelected) {
                  state = "selected";
                }
              }

              /* -----------------------------------------------
                 AFTER CHECK
              ------------------------------------------------ */

              if (isChecked) {
                /*
                 * Correct submission:
                 * Show the correct options in green.
                 */
                if (
                  isCorrect &&
                  isCorrectAnswer
                ) {
                  state = "correct";
                }

                /*
                 * Also keep user's selected options
                 * green when the complete answer is correct.
                 */
                else if (
                  isCorrect &&
                  isSelected
                ) {
                  state = "correct";
                }

                /*
                 * Incorrect submission:
                 * Only selected options become red.
                 *
                 * Correct options are intentionally
                 * not revealed.
                 */
                else if (
                  isSelected &&
                  !isCorrect
                ) {
                  state = "wrong";
                }
              }

              return (
                <GlassMultiOption
                  key={option.id}
                  text={option.text}
                  index={index}
                  state={state}
                  disabled={disabled || isChecked}
                  onPress={() =>
                    onToggle(option.id)
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
   GLASS MULTI OPTION
============================================================ */

interface GlassMultiOptionProps {
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

const GlassMultiOption: React.FC<
  GlassMultiOptionProps
> = ({
  text,
  index,
  state,
  disabled,
  onPress,
}) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
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

    /* ==========================================================
       PRESS ANIMATION
    ========================================================== */

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
            {/* Checkbox */}

            <View
              style={[
                styles.checkbox,

                isSelected &&
                styles.checkboxSelected,

                isCorrect &&
                styles.checkboxCorrect,

                isWrong &&
                styles.checkboxWrong,
              ]}
            >
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={COLORS.white}
                />
              )}

              {isCorrect && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={COLORS.white}
                />
              )}

              {isWrong && (
                <Ionicons
                  name="close"
                  size={18}
                  color={COLORS.white}
                />
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
              RIGHT STATUS
          ================================================== */}

            {/* Normal */}

            {!isSelected &&
              !isCorrect &&
              !isWrong && (
                <View
                  style={styles.rightCheckbox}
                />
              )}

            {/* Selected */}

            {isSelected && (
              <View
                style={styles.statusSelected}
              >
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={COLORS.white}
                />
              </View>
            )}

            {/* Correct */}

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

            {/* Wrong */}

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
   STYLES
============================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: "#F2EFFF",
  },

  /* ==========================================================
     CONTENT
  ========================================================== */

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
   * This matches McqSingleQuestion.
   *
   * There is NO opaque white rectangle here.
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
     OPTION CONTENT
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
     CHECKBOX
  ========================================================== */

  checkbox: {
    width: 48,

    height: 48,

    borderRadius: 17,

    alignItems: "center",

    justifyContent: "center",

    marginRight: 15,

    backgroundColor:
      "rgba(255,255,255,0.035)",

    borderWidth: 1.5,

    borderColor:
      "rgba(255,255,255,0.72)",
  },

  checkboxSelected: {
    backgroundColor:
      "rgba(112,84,246,0.78)",

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  checkboxCorrect: {
    backgroundColor:
      "rgba(32,201,138,0.85)",

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  checkboxWrong: {
    backgroundColor:
      "rgba(239,100,111,0.85)",

    borderColor:
      "rgba(255,255,255,0.75)",
  },

  /* ==========================================================
     ANSWER TEXT
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
     RIGHT EMPTY CHECKBOX
  ========================================================== */

  rightCheckbox: {
    width: 31,

    height: 31,

    borderRadius: 16,

    borderWidth: 2,

    borderColor:
      "rgba(255,255,255,0.78)",

    backgroundColor: "transparent",

    marginLeft: 10,
  },

  /* ==========================================================
     SELECTED
  ========================================================== */

  statusSelected: {
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

    marginLeft: 10,
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

    marginLeft: 10,
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

    marginLeft: 10,
  },

  /* ==========================================================
     GLASS BORDER
  ========================================================== */

  optionBorder: {
    position: "absolute",

    top: 0,

    left: 0,

    right: 0,

    bottom: 0,

    borderRadius: 25,

    borderWidth: 1.5,

    borderColor:
      "rgba(168,212,214,0.72)",

    zIndex: 8,
  },

  optionBorderSelected: {
    borderWidth: 2,

    borderColor:
      "rgba(112,84,246,0.75)",
  },

  optionBorderCorrect: {
    borderWidth: 2,

    borderColor:
      "rgba(32,201,138,0.75)",
  },

  optionBorderWrong: {
    borderWidth: 2,

    borderColor:
      "rgba(239,100,111,0.75)",
  },
});

export default McqMultiQuestion;
