// components/lesson/AudioResponseQuestion.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, typography } from "../../constant/constant";
import { Mascot } from "../Mascot";
import { AudioResponseQuestionData } from "./types";

interface AudioResponseQuestionProps {
  question: AudioResponseQuestionData;
  answerText: string;
  onChangeText: (text: string) => void;
  isChecked?: boolean;
  disabled?: boolean;
}

export const AudioResponseQuestion: React.FC<AudioResponseQuestionProps> = ({
  question,
  answerText,
  onChangeText,
  isChecked = false,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSpeakerPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {/* Prompt */}
      <Text style={styles.promptText}>{question.prompt}</Text>

      {/* Speaker Button */}
      <Animated.View style={[styles.speakerWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={styles.speakerBtn}
          onPress={handleSpeakerPress}
          activeOpacity={0.75}
        >
          <Ionicons name="volume-high" size={38} color={colors.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Text Input Box */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.textInput}
          value={answerText}
          onChangeText={onChangeText}
          placeholder="Type what you hear…"
          placeholderTextColor="#A0A0B0"
          autoCapitalize="sentences"
          autoCorrect={false}
          editable={!disabled}
        />
      </View>

      {/* Mascot tip footer */}
      <View style={styles.mascotTipRow}>
        <Mascot size={70} pose="happy" floating={false} />
        <View style={styles.speechBubble}>
          <Text style={styles.speechText}>
            {question.tipText || "Take your time!\nYou can replay."}
          </Text>
          <View style={styles.speechArrow} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  promptText: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  speakerWrapper: {
    marginBottom: 24,
  },
  speakerBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#F2EEFE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#DDD4FB",
  },
  inputCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 28,
  },
  textInput: {
    ...typography.body,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  mascotTipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  speechBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  speechText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
    lineHeight: 18,
  },
  speechArrow: {
    position: "absolute",
    left: -8,
    top: "50%",
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: "transparent",
    borderBottomWidth: 6,
    borderBottomColor: "transparent",
    borderRightWidth: 8,
    borderRightColor: "#FFFFFF",
  },
});

export default AudioResponseQuestion;
