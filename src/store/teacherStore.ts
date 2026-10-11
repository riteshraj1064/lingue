// src/store/teacherStore.ts
import { create } from "zustand";
import { TeacherMode, TeacherSession } from "@/src/api/teacher/teacherTypes";
import { CorrectionEvent } from "@/src/livekit/livekitTypes";

export interface TranscriptMessage {
  id: string;
  speaker: "agent" | "user";
  text: string;
  timestamp: number;
}

export interface TeacherState {
  session: TeacherSession | null;
  mode: TeacherMode | null;
  isConnecting: boolean;
  isConnected: boolean;
  isUserSpeaking: boolean;
  isTeacherSpeaking: boolean;
  isMicEnabled: boolean;
  transcript: string;
  transcripts: TranscriptMessage[];
  partialTranscript: { speaker: "agent" | "user"; text: string } | null;
  currentHint: string | null;
  currentCorrection: CorrectionEvent | null;
  error: string | null;
  agentStateText: string;

  // Actions
  setSession: (session: TeacherSession | null) => void;
  setMode: (mode: TeacherMode | null) => void;
  setConnecting: (isConnecting: boolean) => void;
  setConnected: (isConnected: boolean) => void;
  setUserSpeaking: (isSpeaking: boolean) => void;
  setTeacherSpeaking: (isSpeaking: boolean) => void;
  setMicEnabled: (enabled: boolean) => void;
  setAgentStateText: (text: string) => void;
  addTranscript: (speaker: "agent" | "user", text: string) => void;
  setPartialTranscript: (partial: { speaker: "agent" | "user"; text: string } | null) => void;
  setHint: (hint: string | null) => void;
  setCorrection: (correction: CorrectionEvent | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  session: null,
  mode: null,
  isConnecting: false,
  isConnected: false,
  isUserSpeaking: false,
  isTeacherSpeaking: false,
  isMicEnabled: true,
  transcript: "",
  transcripts: [],
  partialTranscript: null,
  currentHint: null,
  currentCorrection: null,
  error: null,
  agentStateText: "Ready to start",
};

export const useTeacherStore = create<TeacherState>((set) => ({
  ...initialState,

  setSession: (session) => set({ session }),
  setMode: (mode) => set({ mode }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setConnected: (isConnected) => set({ isConnected }),
  setUserSpeaking: (isUserSpeaking) => set({ isUserSpeaking }),
  setTeacherSpeaking: (isTeacherSpeaking) => set({ isTeacherSpeaking }),
  setMicEnabled: (isMicEnabled) => set({ isMicEnabled }),
  setAgentStateText: (agentStateText) => set({ agentStateText }),

  addTranscript: (speaker, text) =>
    set((state) => ({
      transcript: text,
      transcripts: [
        ...state.transcripts.slice(-20),
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          speaker,
          text,
          timestamp: Date.now(),
        },
      ],
    })),

  setPartialTranscript: (partialTranscript) => set({ partialTranscript }),
  setHint: (currentHint) => set({ currentHint }),
  setCorrection: (currentCorrection) => set({ currentCorrection }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
