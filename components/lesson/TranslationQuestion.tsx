// components/lesson/TranslationQuestion.tsx
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
import { TranslationQuestionData } from "./types";

interface TranslationQuestionProps {
  question: TranslationQuestionData;
  answerText: string;
  onChangeText: (text: string) => void;
  isChecked?: boolean;
  disabled?: boolean;
}

export const TranslationQuestion: React.FC<TranslationQuestionProps> = ({
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

      {/* Source Sentence Card with Audio button */}
      <View style={styles.sentenceCard}>
        <Text style={styles.sourceText}>{question.sourceSentence}</Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={styles.speakerBtn}
            onPress={handleSpeakerPress}
            activeOpacity={0.7}
          >
            <Ionicons name="volume-high" size={20} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Answer Input Box */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.textInput}
          value={answerText}
          onChangeText={onChangeText}
          placeholder="Type your answer…"
          placeholderTextColor="#A0A0B0"
          autoCapitalize="sentences"
          autoCorrect={false}
          editable={!disabled}
          multiline
        />
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
    marginBottom: 24,
  },
  sentenceCard: {
    width: "100%",
    backgroundColor: "#F2EEFE",
    borderRadius: radius.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#DDD4FB",
    marginBottom: 20,
  },
  sourceText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: "800",
    flex: 1,
  },
  speakerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  inputCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    padding: 16,
    minHeight: 120,
  },
  textInput: {
    ...typography.body,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: "600",
    minHeight: 80,
    textAlignVertical: "top",
  },
});

export default TranslationQuestion;
