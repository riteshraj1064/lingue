
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  radius,
  shadows,
  typography
} from "../../constant/constant";

import { Mascot } from "../Mascot";
import { PrimaryButton } from "../PrimaryButton";

interface AnswerFeedbackSheetProps {
  isCorrect: boolean;
  correctAnswerText?: string;
  explanation?: string;
  xpEarned?: number;
  onContinue: () => void;
}

export const AnswerFeedbackSheet: React.FC<
  AnswerFeedbackSheetProps
> = ({
  isCorrect,
  correctAnswerText,
  explanation,
  xpEarned = 10,
  onContinue,
}) => {
    const slideAnim = useRef(new Animated.Value(120)).current;

    useEffect(() => {
      Animated.spring(slideAnim, {
        toValue: 0,
        bounciness: 6,
        speed: 14,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.sheetContainer,
          isCorrect ? styles.sheetCorrect : styles.sheetWrong,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Glass highlight layer */}
        <View
          pointerEvents="none"
          style={styles.glassHighlight}
        />

        {/* Top glass reflection */}
        <View
          pointerEvents="none"
          style={styles.topReflection}
        />

        {isCorrect ? (
          /* ───────────── CORRECT STATE ───────────── */
          <View style={styles.contentWrap}>
            <View style={styles.celebrationRow}>
              <View style={styles.mascotWrap}>
                <Mascot
                  size={78}
                  pose="celebrating"
                  floating={true}
                />
              </View>

              <View style={styles.textColumn}>
                <View style={styles.headingRow}>
                  <View style={styles.sparkleGlass}>
                    <Ionicons
                      name="sparkles"
                      size={18}
                      color="#B9FFCE"
                    />
                  </View>

                  <Text style={styles.correctTitle}>
                    Correct!
                  </Text>
                </View>

                <View style={styles.xpPill}>
                  <View style={styles.xpIconGlass}>
                    <Ionicons
                      name="flash"
                      size={15}
                      color="#FFE08A"
                    />
                  </View>

                  <Text style={styles.xpPillText}>
                    +{xpEarned} XP
                  </Text>
                </View>

                <Text style={styles.niceWorkText}>
                  Nice work! You're learning so fast!
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* ───────────── INCORRECT STATE ───────────── */
          <View style={styles.contentWrap}>
            <View style={styles.celebrationRow}>
              <View style={styles.mascotWrap}>
                <Mascot
                  size={78}
                  pose="encouraging"
                  floating={false}
                />
              </View>

              <View style={styles.textColumn}>
                <Text style={styles.wrongTitle}>
                  Not quite!
                </Text>

                {correctAnswerText && (
                  <View style={styles.answerBlock}>
                    <Text style={styles.answerLabel}>
                      Correct answer:
                    </Text>

                    <View style={styles.answerGlass}>
                      <Text style={styles.answerValue}>
                        {correctAnswerText}
                      </Text>
                    </View>
                  </View>
                )}

                {explanation && (
                  <View style={styles.explanationBlock}>
                    <Text style={styles.explanationLabel}>
                      Explanation:
                    </Text>

                    <Text style={styles.explanationValue}>
                      {explanation}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Continue Button */}
        <View style={styles.buttonWrapper}>
          <PrimaryButton
            title="Continue"
            onPress={onContinue}
            size="large"
            style={styles.continueBtn}
          />
        </View>
      </Animated.View>
    );
  };

const styles = StyleSheet.create({
  /*
   * ============================================================
   * GLASS SHEET
   * ============================================================
   */

  sheetContainer: {
    width: "100%",

    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,

    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    borderTopWidth: 1,

    /*
     * Transparent glass instead of solid background.
     */
    backgroundColor: "rgba(255, 255, 255, 0.12)",

    /*
     * Glass shadow.
     */
    ...shadows.floating,

    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: -8,
    },

    elevation: 20,

    overflow: "hidden",
  },

  /*
   * Correct glass:
   * subtle emerald tint while remaining transparent.
   */
  sheetCorrect: {
    backgroundColor: "rgba(17, 48, 35, 0.42)",
    borderTopColor: "rgba(112, 255, 164, 0.55)",
  },

  /*
   * Wrong glass:
   * subtle red tint while remaining transparent.
   */
  sheetWrong: {
    backgroundColor: "rgba(55, 24, 30, 0.44)",
    borderTopColor: "rgba(255, 126, 143, 0.55)",
  },

  /*
   * Large transparent white highlight.
   * Gives the sheet the glass/reflection appearance.
   */
  glassHighlight: {
    position: "absolute",
    top: -70,
    left: -30,
    right: -30,
    height: 110,

    backgroundColor: "rgba(255, 255, 255, 0.075)",

    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },

  /*
   * Thin reflection line at the top.
   */
  topReflection: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,

    backgroundColor: "rgba(255, 255, 255, 0.45)",

    opacity: 0.65,
  },

  /*
   * ============================================================
   * CONTENT
   * ============================================================
   */

  contentWrap: {
    marginBottom: 16,
  },

  celebrationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  mascotWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  textColumn: {
    flex: 1,
    paddingTop: 4,
  },

  /*
   * ============================================================
   * CORRECT HEADER
   * ============================================================
   */

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 6,
  },

  sparkleGlass: {
    width: 30,
    height: 30,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 15,

    backgroundColor: "rgba(114, 255, 165, 0.13)",

    borderWidth: 1,
    borderColor: "rgba(159, 255, 191, 0.25)",
  },

  correctTitle: {
    ...typography.h2,

    color: "#D8FFE5",

    fontWeight: "900",

    textShadowColor: "rgba(76, 255, 139, 0.25)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 5,
  },

  /*
   * ============================================================
   * XP GLASS PILL
   * ============================================================
   */

  xpPill: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "rgba(255, 205, 71, 0.13)",

    paddingHorizontal: 10,
    paddingVertical: 4,

    borderRadius: radius.pill,

    alignSelf: "flex-start",

    gap: 5,

    marginBottom: 8,

    borderWidth: 1,
    borderColor: "rgba(255, 224, 138, 0.25)",
  },

  xpIconGlass: {
    width: 22,
    height: 22,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 11,

    backgroundColor: "rgba(255, 218, 91, 0.12)",
  },

  xpPillText: {
    ...typography.caption,

    fontWeight: "900",

    color: "#FFE9A8",
  },

  niceWorkText: {
    ...typography.body,

    fontWeight: "700",

    color: "rgba(255, 255, 255, 0.88)",

    lineHeight: 20,
  },

  /*
   * ============================================================
   * WRONG STATE
   * ============================================================
   */

  wrongTitle: {
    ...typography.h2,

    color: "#FFD9DE",

    fontWeight: "900",

    marginBottom: 8,

    textShadowColor: "rgba(255, 95, 116, 0.25)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 5,
  },

  answerBlock: {
    marginBottom: 6,
  },

  answerLabel: {
    ...typography.tiny,

    color: "rgba(255, 178, 188, 0.95)",

    fontWeight: "800",

    textTransform: "uppercase",

    letterSpacing: 0.5,
  },

  /*
   * Small inner glass surface around the answer.
   */
  answerGlass: {
    marginTop: 3,

    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 10,

    backgroundColor: "rgba(255, 255, 255, 0.07)",

    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  answerValue: {
    ...typography.body,

    fontWeight: "800",

    color: "rgba(255, 255, 255, 0.94)",
  },

  explanationBlock: {
    marginTop: 4,
  },

  explanationLabel: {
    ...typography.tiny,

    color: "rgba(255, 255, 255, 0.58)",

    fontWeight: "800",
  },

  explanationValue: {
    ...typography.caption,

    color: "rgba(255, 255, 255, 0.70)",

    lineHeight: 16,

    marginTop: 2,
  },

  /*
   * ============================================================
   * CONTINUE BUTTON
   * ============================================================
   */

  buttonWrapper: {
    width: "100%",
  },

  continueBtn: {
    width: "100%",

    borderRadius: radius.button,

    /*
     * Keep the existing PrimaryButton behavior/shadow.
     */
    //@ts-ignore
    ...shadows.buttonPrimary,
  },
});

export default AnswerFeedbackSheet;
