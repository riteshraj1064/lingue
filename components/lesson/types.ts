// components/lesson/types.ts

export type QuestionType =
  | "mcq_single"
  | "mcq_multi"
  | "fill_blank"
  | "word_bank"
  | "speaking"
  | "listening"
  | "translation"
  | "image_selection"
  | "audio_response";

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  subPrompt?: string;
  instruction?: string;
  audioPromptText?: string;
  xpReward?: number;
  explanation?: string;
}

export interface McqSingleQuestionData extends BaseQuestion {
  type: "mcq_single";
  options: { id: string; text: string }[];
  correctAnswerId: string;
}

export interface McqMultiQuestionData extends BaseQuestion {
  type: "mcq_multi";
  imageEmoji?: string;
  options: { id: string; text: string }[];
  correctAnswerIds: string[];
}

export interface FillInBlankQuestionData extends BaseQuestion {
  type: "fill_blank";
  characterSpeech?: string;
  sentenceBefore: string;
  sentenceAfter: string;
  options: string[];
  correctAnswer: string;
}

export interface WordBankQuestionData extends BaseQuestion {
  type: "word_bank";
  characterSpeech?: string;
  words: { id: string; text: string }[];
  correctSentence: { id: string; text: string }[];
}

export interface SpeakingQuestionData extends BaseQuestion {
  type: "speaking";
  targetSentence: string;
  hint?: string;
}

export interface ListeningQuestionData extends BaseQuestion {
  type: "listening";
  audioText: string;
  audioUrl?: string | null;
  audioLanguage?: string | null;
  audioSpeed?: number | null;
  options: { id: string; text: string }[];
  instruction?: string;
  correctAnswerId?: string;
  correctAnswer?: string;
}

export interface TranslationQuestionData extends BaseQuestion {
  type: "translation";
  sourceSentence: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
}

export interface ImageSelectionQuestionData extends BaseQuestion {
  type: "image_selection";
  options: { id: string; label: string; emoji: string }[];
  correctAnswerId: string;
}

export interface AudioResponseQuestionData extends BaseQuestion {
  type: "audio_response";
  audioText: string;
  correctAnswer: string;
  tipText?: string;
}

export type LessonQuestion =
  | McqSingleQuestionData
  | McqMultiQuestionData
  | FillInBlankQuestionData
  | WordBankQuestionData
  | SpeakingQuestionData
  | ListeningQuestionData
  | TranslationQuestionData
  | ImageSelectionQuestionData
  | AudioResponseQuestionData;

export interface LessonInfo {
  id: string;
  unitTitle: string;
  lessonTitle: string;
  description: string;
  totalQuestions: number;
  estimatedMinutes: number;
  xpReward: number;
}
