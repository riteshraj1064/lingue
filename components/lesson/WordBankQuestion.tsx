// components/lesson/WordBankQuestion.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo } from "react";
import {
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
  vec,
} from "@shopify/react-native-skia";

import { typography } from "../../constant/constant";
import { Mascot } from "../Mascot";
import { WordBankQuestionData } from "./types";

/* ============================================================
   TYPES
============================================================ */

interface WordItem {
  id: string;
  text: string;
}

interface WordBankQuestionProps {
  question: WordBankQuestionData;

  selectedWords: WordItem[];

  onAddWord: (word: WordItem, index: number) => void;

  onRemoveWord: (index: number) => void;

  onCheckAnswer?: () => void;

  isChecked?: boolean;

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

  white: "#FFFFFF",

  green: "#20C98A",
  greenDark: "#117553",

  red: "#EF646F",
  redDark: "#B43C47",

  cyan: "#2CCDDC",

  border: "rgba(255,255,255,0.78)",
};

/* ============================================================
   CONSTANTS
============================================================ */

const CHIP_HEIGHT = 50;

/* ============================================================
   GLASS PANEL

   IMPORTANT:
   No BlurView here.
   Android BlurView can create a white surface.
============================================================ */

interface GlassPanelProps {
  children: React.ReactNode;
  style?: any;
}

const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  style,
}) => {
  return (
    <View style={[styles.glassPanel, style]}>
      <View
        pointerEvents="none"
        style={styles.glassPanelOverlay}
      />

      <View
        pointerEvents="none"
        style={styles.glassPanelHighlight}
      />

      <View style={styles.glassContent}>
        {children}
      </View>
    </View>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

export const WordBankQuestion: React.FC<
  WordBankQuestionProps
> = ({
  question,
  selectedWords,
  onAddWord,
  onRemoveWord,
  onCheckAnswer,
  isChecked = false,
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
       USED WORD COUNTS
    ========================================================== */

    const usedCounts = useMemo(() => {
      const counts: Record<string, number> = {};

      selectedWords.forEach((word) => {
        counts[word.id] =
          (counts[word.id] || 0) + 1;
      });

      return counts;
    }, [selectedWords]);

    /* ==========================================================
       DUPLICATE WORD SUPPORT
    ========================================================== */

    const isWordUsed = useCallback(
      (word: WordItem, index: number) => {
        const occurrence = question.words
          .slice(0, index + 1)
          .filter(
            (item) => item.id === word.id
          ).length;

        return (
          (usedCounts[word.id] || 0) >=
          occurrence
        );
      },
      [question.words, usedCounts]
    );

    /* ==========================================================
       ADD WORD
    ========================================================== */

    const handleAddWord = useCallback(
      (word: WordItem, index: number) => {
        if (disabled) {
          return;
        }

        if (isWordUsed(word, index)) {
          return;
        }

        onAddWord(word, index);
      },
      [disabled, isWordUsed, onAddWord]
    );

    /* ==========================================================
       REMOVE WORD
    ========================================================== */

    const handleRemoveWord = useCallback(
      (index: number) => {
        if (disabled) {
          return;
        }

        if (
          index < 0 ||
          index >= selectedWords.length
        ) {
          return;
        }

        onRemoveWord(index);
      },
      [
        disabled,
        selectedWords.length,
        onRemoveWord,
      ]
    );

    /* ==========================================================
       CLEAR
    ========================================================== */

    const handleClear = useCallback(() => {
      if (disabled) {
        return;
      }

      for (
        let index = selectedWords.length - 1;
        index >= 0;
        index--
      ) {
        onRemoveWord(index);
      }
    }, [
      disabled,
      selectedWords.length,
      onRemoveWord,
    ]);

    /* ==========================================================
       WORD BANK CHIP WIDTH
    ========================================================== */

    const bankChipWidth = useMemo(() => {
      if (width < 350) {
        return "31%";
      }

      if (width < 430) {
        return "31.5%";
      }

      return "23.5%";
    }, [width]);

    /* ==========================================================
       UI
    ========================================================== */

    return (
      <View style={styles.container}>
        {/* ======================================================
        FIXED BACKGROUND
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

          <Circle
            cx={width * 0.92}
            cy={height * 0.18}
            r={width * 0.55}
            color="rgba(112,84,246,0.14)"
          />

          <Circle
            cx={-width * 0.08}
            cy={height * 0.72}
            r={width * 0.48}
            color="rgba(44,205,220,0.10)"
          />

          <Circle
            cx={width * 0.82}
            cy={height * 0.90}
            r={width * 0.43}
            color="rgba(112,84,246,0.08)"
          />

          <Circle
            cx={width * 0.50}
            cy={height * 0.48}
            r={width * 0.40}
            color="rgba(255,255,255,0.22)"
          />

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

          <Circle
            cx={width * 0.78}
            cy={height * 0.76}
            r={5}
            color="rgba(112,84,246,0.14)"
          />
        </Canvas>

        {/* ======================================================
        SCROLLABLE CONTENT
    ====================================================== */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          alwaysBounceVertical={false}
        >
          <View style={styles.content}>
            {/* ==================================================
            TITLE
        ================================================== */}

            <View style={styles.header}>
              <View style={styles.titlePill}>
                <View style={styles.titleIcon}>
                  <Ionicons
                    name="text-outline"
                    size={19}
                    color={COLORS.purple}
                  />
                </View>

                <Text style={styles.titleText}>
                  BUILD THE SENTENCE
                </Text>
              </View>

              <Text
                style={[
                  styles.promptText,
                  {
                    fontSize: 27 * scale,
                    lineHeight: 34 * scale,
                  },
                ]}
              >
                {question.prompt || "Build the sentence."}
              </Text>

              <Text style={styles.subtitleText}>
                Tap the words below to arrange them
              </Text>
            </View>

            {/* ==================================================
            MASCOT
        ================================================== */}

            <View style={styles.mascotArea}>
              <View style={styles.mascotGlass}>
                <View
                  pointerEvents="none"
                  style={styles.mascotGlassOverlay}
                />

                <Mascot />
              </View>

              <Text style={styles.sparkOne}>
                ✦
              </Text>

              <Text style={styles.sparkTwo}>
                ✦
              </Text>
            </View>

            {/* ==================================================
            YOUR SENTENCE
        ================================================== */}

            <GlassPanel>
              <View style={styles.panelHeader}>
                <View style={styles.panelTitleArea}>
                  <Text style={styles.panelTitle}>
                    Your sentence
                  </Text>

                  <Text style={styles.panelSubtitle}>
                    {selectedWords.length > 0
                      ? `${selectedWords.length} word${selectedWords.length === 1
                        ? ""
                        : "s"
                      } selected`
                      : "Build your answer below"}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  disabled={
                    disabled ||
                    selectedWords.length === 0
                  }
                  onPress={handleClear}
                  style={[
                    styles.clearButton,
                    selectedWords.length === 0 &&
                    styles.clearDisabled,
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={17}
                    color={COLORS.purple}
                  />

                  <Text style={styles.clearText}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SENTENCE */}

              <View
                style={[
                  styles.sentenceArea,
                  selectedWords.length > 0 &&
                  styles.sentenceAreaFilled,
                ]}
              >
                <View
                  pointerEvents="none"
                  style={styles.sentenceAreaOverlay}
                />

                {selectedWords.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.handCircle}>
                      <Ionicons
                        name="hand-left-outline"
                        size={24}
                        color={COLORS.purple}
                      />
                    </View>

                    <Text style={styles.emptyTitle}>
                      Tap words below
                    </Text>

                    <Text style={styles.emptySubtitle}>
                      Choose words from the Word Bank
                    </Text>
                  </View>
                ) : (
                  <View style={styles.selectedWords}>
                    {selectedWords.map(
                      (word, index) => (
                        <TouchableOpacity
                          key={`${word.id}-${index}`}
                          activeOpacity={0.75}
                          disabled={disabled}
                          onPress={() =>
                            handleRemoveWord(index)
                          }
                          style={styles.sentenceChip}
                        >
                          <View
                            pointerEvents="none"
                            style={
                              styles.sentenceChipOverlay
                            }
                          />

                          <View
                            pointerEvents="none"
                            style={
                              styles.chipHighlight
                            }
                          />

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.selectedChipText,
                              {
                                fontSize:
                                  16 * scale,
                              },
                            ]}
                          >
                            {word.text}
                          </Text>

                          <View
                            style={styles.removeBadge}
                          >
                            <Ionicons
                              name="close"
                              size={11}
                              color={COLORS.white}
                            />
                          </View>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}
              </View>

              {selectedWords.length > 0 && (
                <Text style={styles.bottomHint}>
                  Tap a word to remove it
                </Text>
              )}
            </GlassPanel>

            {/* ==================================================
            WORD BANK
        ================================================== */}

            <GlassPanel style={styles.wordBankPanel}>
              <View style={styles.panelHeader}>
                <View style={styles.panelTitleArea}>
                  <Text style={styles.panelTitle}>
                    Word Bank
                  </Text>

                  <Text style={styles.panelSubtitle}>
                    Use all the words
                  </Text>
                </View>

                <View style={styles.wordCountBadge}>
                  <Text style={styles.wordCountText}>
                    {question.words.length}
                  </Text>
                </View>
              </View>

              <View style={styles.wordBank}>
                {question.words.map(
                  (word, index) => {
                    const used = isWordUsed(
                      word,
                      index
                    );

                    return (
                      <TouchableOpacity
                        key={`${word.id}-${index}`}
                        activeOpacity={
                          used ? 1 : 0.75
                        }
                        disabled={
                          disabled || used
                        }
                        onPress={() =>
                          handleAddWord(
                            word,
                            index
                          )
                        }
                        style={[
                          styles.wordChip,
                          {
                            width:
                              bankChipWidth,
                          },
                          used &&
                          styles.wordChipUsed,
                        ]}
                      >
                        <View
                          pointerEvents="none"
                          style={[
                            styles.wordChipOverlay,
                            used &&
                            styles.wordChipOverlayUsed,
                          ]}
                        />

                        <View
                          pointerEvents="none"
                          style={
                            styles.chipHighlight
                          }
                        />

                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.72}
                          style={[
                            styles.wordChipText,
                            {
                              fontSize:
                                15 * scale,
                            },
                            used &&
                            styles.wordChipTextUsed,
                          ]}
                        >
                          {word.text}
                        </Text>

                        {used && (
                          <View
                            style={
                              styles.usedBadge
                            }
                          >
                            <Ionicons
                              name="checkmark"
                              size={11}
                              color={COLORS.white}
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </GlassPanel>

            {/* ==================================================
            CHECK ANSWER
        ================================================== */}

            {onCheckAnswer && (
              <TouchableOpacity
                activeOpacity={0.86}
                disabled={
                  disabled ||
                  selectedWords.length === 0
                }
                onPress={onCheckAnswer}
                style={[
                  styles.checkButton,
                  (disabled ||
                    selectedWords.length === 0) &&
                  styles.checkDisabled,
                  isChecked &&
                  styles.checkButtonChecked,
                ]}
              >
                <View
                  pointerEvents="none"
                  style={styles.checkButtonOverlay}
                />

                <View
                  pointerEvents="none"
                  style={styles.checkButtonHighlight}
                />

                <Text style={styles.checkText}>
                  {isChecked
                    ? "Answer Checked"
                    : "Check Answer"}
                </Text>

                <View style={styles.checkIcon}>
                  <Ionicons
                    name={
                      isChecked
                        ? "checkmark"
                        : "arrow-forward"
                    }
                    size={20}
                    color={COLORS.white}
                  />
                </View>
              </TouchableOpacity>
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
    paddingBottom: 20,
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

    letterSpacing: 0.6,

    color: COLORS.purple,
  },

  promptText: {
    ...typography.h2,

    color: COLORS.text,

    fontWeight: "900",

    textAlign: "center",

    marginTop: 23,

    marginBottom: 6,

    paddingHorizontal: 8,

    letterSpacing: -0.7,
  },

  subtitleText: {
    color: COLORS.muted,

    fontSize: 15,

    lineHeight: 20,

    fontWeight: "700",

    textAlign: "center",

    marginBottom: 0,
  },

  /* ==========================================================
     MASCOT
  ========================================================== */

  mascotArea: {
    width: "100%",

    height: 118,

    alignItems: "center",

    justifyContent: "center",

    position: "relative",
  },

  mascotGlass: {
    width: 96,

    height: 96,

    borderRadius: 48,

    overflow: "hidden",

    backgroundColor:
      "rgba(255,255,255,0.055)",

    borderWidth: 1.5,

    borderColor:
      "rgba(255,255,255,0.76)",

    alignItems: "center",

    justifyContent: "center",

    shadowColor: COLORS.purple,

    shadowOpacity: 0.06,

    shadowRadius: 16,

    shadowOffset: {
      width: 0,

      height: 5,
    },

    elevation: 0,
  },

  mascotGlassOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.025)",
  },

  sparkOne: {
    position: "absolute",

    left: "59%",

    top: 12,

    color: "#F5BD3F",

    fontSize: 24,

    fontWeight: "900",
  },

  sparkTwo: {
    position: "absolute",

    left: "65%",

    top: 39,

    color: "#F5BD3F",

    fontSize: 15,

    fontWeight: "900",
  },

  /* ==========================================================
     GLASS PANEL

     No BlurView.
     No white Android blur surface.
  ========================================================== */

  glassPanel: {
    width: "100%",

    overflow: "hidden",

    borderRadius: 24,

    borderWidth: 1.4,

    borderColor:
      "rgba(255,255,255,0.76)",

    backgroundColor:
      "rgba(255,255,255,0.065)",

    marginBottom: 11,

    shadowColor: COLORS.purple,

    shadowOpacity: 0.035,

    shadowRadius: 14,

    shadowOffset: {
      width: 0,

      height: 5,
    },

    elevation: 0,
  },

  glassPanelOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(112,84,246,0.018)",
  },

  glassPanelHighlight: {
    position: "absolute",

    top: 0,

    left: 18,

    right: 18,

    height: 1.3,

    backgroundColor:
      "rgba(255,255,255,0.82)",
  },

  glassContent: {
    width: "100%",

    paddingHorizontal: 15,

    paddingTop: 14,

    paddingBottom: 14,
  },

  /* ==========================================================
     PANEL HEADER
  ========================================================== */

  panelHeader: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 10,
  },

  panelTitleArea: {
    flex: 1,
  },

  panelTitle: {
    color: COLORS.text,

    fontSize: 18,

    lineHeight: 23,

    fontWeight: "900",
  },

  panelSubtitle: {
    color: COLORS.muted,

    fontSize: 11,

    lineHeight: 15,

    fontWeight: "700",

    marginTop: 1,
  },

  /* ==========================================================
     CLEAR
  ========================================================== */

  clearButton: {
    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 11,

    paddingVertical: 7,

    borderRadius: 18,

    backgroundColor:
      "rgba(112,84,246,0.075)",

    borderWidth: 1,

    borderColor:
      "rgba(112,84,246,0.18)",
  },

  clearDisabled: {
    opacity: 0.28,
  },

  clearText: {
    color: COLORS.purple,

    fontSize: 13,

    fontWeight: "800",

    marginLeft: 4,
  },

  /* ==========================================================
     SMALL SENTENCE AREA
  ========================================================== */

  sentenceArea: {
    width: "100%",

    minHeight: 118,

    maxHeight: 145,

    borderRadius: 19,

    borderWidth: 1.4,

    borderColor:
      "rgba(255,255,255,0.72)",

    borderStyle: "dashed",

    backgroundColor:
      "rgba(255,255,255,0.025)",

    paddingHorizontal: 10,

    paddingVertical: 10,

    justifyContent: "center",

    overflow: "hidden",
  },

  sentenceAreaFilled: {
    minHeight: 118,

    borderStyle: "solid",

    borderColor:
      "rgba(112,84,246,0.30)",

    backgroundColor:
      "rgba(112,84,246,0.035)",

    justifyContent: "center",
  },

  sentenceAreaOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.015)",
  },

  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  emptyState: {
    width: "100%",

    alignItems: "center",

    justifyContent: "center",
  },

  handCircle: {
    width: 40,

    height: 40,

    borderRadius: 20,

    backgroundColor:
      "rgba(112,84,246,0.07)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.70)",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 6,
  },

  emptyTitle: {
    color: COLORS.text,

    fontSize: 14,

    lineHeight: 19,

    fontWeight: "900",

    textAlign: "center",
  },

  emptySubtitle: {
    color: COLORS.muted,

    fontSize: 11,

    lineHeight: 16,

    fontWeight: "600",

    marginTop: 2,

    textAlign: "center",
  },

  /* ==========================================================
     SELECTED WORDS
  ========================================================== */

  selectedWords: {
    width: "100%",

    minHeight: 96,

    flexDirection: "row",

    flexWrap: "wrap",

    alignItems: "center",

    justifyContent: "center",

    paddingVertical: 2,

    gap: 7,
  },

  sentenceChip: {
    minHeight: CHIP_HEIGHT,

    minWidth: 65,

    maxWidth: "90%",

    borderRadius: 16,

    backgroundColor:
      "rgba(112,84,246,0.095)",

    borderWidth: 1.3,

    borderColor:
      "rgba(112,84,246,0.48)",

    borderBottomWidth: 3,

    borderBottomColor:
      "rgba(81,55,216,0.52)",

    alignItems: "center",

    justifyContent: "center",

    position: "relative",

    paddingHorizontal: 13,

    overflow: "visible",

    shadowColor: COLORS.purple,

    shadowOpacity: 0.04,

    shadowRadius: 7,

    shadowOffset: {
      width: 0,

      height: 3,
    },

    elevation: 0,
  },

  sentenceChipOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.025)",

    borderRadius: 16,
  },

  chipHighlight: {
    position: "absolute",

    top: 1,

    left: 8,

    right: 8,

    height: 1,

    backgroundColor:
      "rgba(255,255,255,0.70)",
  },

  selectedChipText: {
    color: COLORS.purpleDark,

    fontSize: 16,

    fontWeight: "900",

    textAlign: "center",
  },

  removeBadge: {
    position: "absolute",

    right: -6,

    top: -7,

    width: 21,

    height: 21,

    borderRadius: 11,

    backgroundColor: COLORS.purple,

    borderWidth: 1.5,

    borderColor:
      "rgba(255,255,255,0.90)",

    alignItems: "center",

    justifyContent: "center",

    zIndex: 20,
  },

  bottomHint: {
    color: COLORS.muted,

    fontSize: 10,

    fontWeight: "700",

    textAlign: "center",

    marginTop: 6,
  },

  /* ==========================================================
     WORD BANK
  ========================================================== */

  wordBankPanel: {
    marginBottom: 11,
  },

  wordCountBadge: {
    minWidth: 30,

    height: 30,

    paddingHorizontal: 8,

    borderRadius: 15,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(112,84,246,0.075)",

    borderWidth: 1,

    borderColor:
      "rgba(112,84,246,0.17)",
  },

  wordCountText: {
    color: COLORS.purple,

    fontSize: 12,

    fontWeight: "900",
  },

  wordBank: {
    width: "100%",

    flexDirection: "row",

    flexWrap: "wrap",

    justifyContent: "space-between",

    rowGap: 8,
  },

  /* ==========================================================
     WORD CHIP

     NO BlurView.
     Completely transparent inner surface.
  ========================================================== */

  wordChip: {
    minHeight: 48,

    borderRadius: 16,

    backgroundColor:
      "rgba(255,255,255,0.055)",

    borderWidth: 1.3,

    borderColor:
      "rgba(168,212,214,0.58)",

    borderBottomWidth: 3,

    borderBottomColor:
      "rgba(120,180,185,0.38)",

    alignItems: "center",

    justifyContent: "center",

    position: "relative",

    paddingHorizontal: 7,

    overflow: "visible",

    shadowColor: COLORS.purple,

    shadowOpacity: 0.025,

    shadowRadius: 6,

    shadowOffset: {
      width: 0,

      height: 2,
    },

    elevation: 0,
  },

  wordChipOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.018)",

    borderRadius: 16,
  },

  wordChipOverlayUsed: {
    backgroundColor:
      "rgba(255,255,255,0.006)",
  },

  wordChipUsed: {
    opacity: 0.35,

    backgroundColor:
      "rgba(255,255,255,0.025)",

    borderColor:
      "rgba(255,255,255,0.25)",
  },

  wordChipText: {
    color: COLORS.text,

    fontSize: 15,

    fontWeight: "900",

    textAlign: "center",

    backgroundColor: "transparent",
  },

  wordChipTextUsed: {
    color: COLORS.muted,
  },

  usedBadge: {
    position: "absolute",

    right: -5,

    top: -6,

    width: 20,

    height: 20,

    borderRadius: 10,

    backgroundColor:
      "rgba(112,84,246,0.88)",

    borderWidth: 1.5,

    borderColor:
      "rgba(255,255,255,0.78)",

    alignItems: "center",

    justifyContent: "center",
  },

  /* ==========================================================
     CHECK BUTTON
  ========================================================== */

  checkButton: {
    width: "96%",

    minHeight: 58,

    borderRadius: 29,

    backgroundColor:
      "rgba(112,84,246,0.72)",

    borderWidth: 1.4,

    borderColor:
      "rgba(255,255,255,0.76)",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 20,

    marginTop: 1,

    marginBottom: 16,

    alignSelf: "center",

    position: "relative",

    overflow: "hidden",

    shadowColor: COLORS.purple,

    shadowOpacity: 0.16,

    shadowRadius: 13,

    shadowOffset: {
      width: 0,

      height: 5,
    },

    elevation: 3,
  },

  checkButtonChecked: {
    backgroundColor:
      "rgba(32,201,138,0.72)",
  },

  checkButtonOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(255,255,255,0.025)",
  },

  checkButtonHighlight: {
    position: "absolute",

    top: 1,

    left: 20,

    right: 20,

    height: 1.2,

    backgroundColor:
      "rgba(255,255,255,0.75)",
  },

  checkDisabled: {
    opacity: 0.30,
  },

  checkText: {
    color: COLORS.white,

    fontSize: 17,

    fontWeight: "900",

    textAlign: "center",

    marginRight: 11,
  },

  checkIcon: {
    width: 32,

    height: 32,

    borderRadius: 16,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.15)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.32)",
  },
});

export default WordBankQuestion;