// components/lesson/ImageSelectionQuestion.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, typography } from "../../constant/constant";
import { ImageSelectionQuestionData } from "./types";

interface ImageSelectionQuestionProps {
  question: ImageSelectionQuestionData;
  selectedOptionId: string | null;
  onSelect: (id: string) => void;
  isChecked?: boolean;
  disabled?: boolean;
}

export const ImageSelectionQuestion: React.FC<ImageSelectionQuestionProps> = ({
  question,
  selectedOptionId,
  onSelect,
  isChecked = false,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      {/* Prompt */}
      <Text style={styles.promptText}>{question.prompt}</Text>

      {/* 2x2 Image Grid */}
      <View style={styles.grid}>
        {question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrectAnswer = option.id === question.correctAnswerId;

          let cardStyle = styles.cardNormal;

          if (isChecked) {
            if (isSelected) {
              cardStyle = isCorrectAnswer ? styles.cardCorrect : styles.cardWrong;
            } else if (isCorrectAnswer) {
              cardStyle = styles.cardCorrect;
            }
          } else if (isSelected) {
            cardStyle = styles.cardSelected;
          }

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.card, cardStyle]}
              onPress={() => !disabled && onSelect(option.id)}
              activeOpacity={0.8}
              disabled={disabled}
            >
              {/* Checkmark Badge on top-right */}
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                </View>
              )}

              {/* Emoji / Illustration */}
              <Text style={styles.emojiText}>{option.emoji}</Text>
            </TouchableOpacity>
          );
        })}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    width: "100%",
    maxWidth: 320,
  },
  card: {
    width: 140,
    height: 140,
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    position: "relative",
  },
  cardNormal: {
    borderColor: "#E5E7EB",
  },
  cardSelected: {
    borderColor: colors.success,
    backgroundColor: "#F2FBF0",
  },
  cardCorrect: {
    borderColor: colors.success,
    backgroundColor: "#F2FBF0",
  },
  cardWrong: {
    borderColor: colors.danger,
    backgroundColor: "#FFF5F5",
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 64,
  },
});

export default ImageSelectionQuestion;
