// src/livekit/livekitTypes.ts

export type TeacherEventType =
  | "session_started"
  | "user_started_speaking"
  | "user_stopped_speaking"
  | "teacher_started_speaking"
  | "teacher_stopped_speaking"
  | "transcript_partial"
  | "transcript_final"
  | "transcript"
  | "correction"
  | "hint"
  | "explanation"
  | "lesson_progress"
  | "session_completed"
  | "session_timeout"
  | "agent_state"
  | "user_state"
  | "session_ended"
  | "end_call"
  | "lesson_loaded"
  | "question_started"
  | "duration_started"
  | "agent_turn_done"
  | "agent_response"
  | "user_transcript"
  | "lesson_completed";

export interface CorrectionEvent {
  type: "correction";
  original: string;
  corrected: string;
  mistake_type?: string;
  severity?: "low" | "medium" | "high" | string;
  repeat?: boolean;
}

export interface HintEvent {
  type: "hint";
  text: string;
}

export interface ExplanationEvent {
  type: "explanation";
  text: string;
}

export interface TranscriptEvent {
  type: "transcript_partial" | "transcript_final" | "transcript";
  speaker?: "agent" | "user";
  text: string;
}

export interface GenericTeacherEvent {
  type: Exclude<
    TeacherEventType,
    "correction" | "hint" | "explanation" | "transcript" | "transcript_partial" | "transcript_final"
  >;
  [key: string]: any;
}

export type TeacherEvent =
  | CorrectionEvent
  | HintEvent
  | ExplanationEvent
  | TranscriptEvent
  | GenericTeacherEvent;

export interface TeacherControlMessage {
  action:
    | "end_quiz_teacher"
    | "end_teacher"
    | "end_session"
    | "user_started_speaking"
    | "user_stopped_speaking"
    | "commit";
}
