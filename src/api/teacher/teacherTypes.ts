// src/api/teacher/teacherTypes.ts

export type TeacherMode = "lesson" | "free_teacher" | "quiz";

export interface TeacherSessionRequest {
  mode: TeacherMode;
  native_language: string;
  target_language: string;
  level?: string;
  lesson_id?: number;
  question_id?: number;
  user_answer?: string;
  is_correct?: boolean;
  topic?: string;
  goal?: string;
  conversation_style?: string;
}

export interface TeacherSession {
  id: string;
  user_id: string;
  mode: TeacherMode;
  plan?: string;
  native_language: string;
  target_language: string;
  level?: string;
  lesson_id?: number | null;
  question_id?: number | null;
  topic?: string | null;
  room_name: string;
  question_count?: number | null;
  question_index?: number | null;
  quiz_id?: number | null;
  max_duration_seconds: number | null;
  actual_duration_seconds?: number | null;
  status: string;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
}

export interface StreamCredentials {
  api_key: string;
  call_type: string;
  call_id: string;
  token: string;
  user_id: string;
  agent_user_id: string;
  expires_at: number;
}

export interface TeacherSessionResponse {
  success?: boolean;
  session: TeacherSession;
  stream: StreamCredentials;
  expires_at?: string | number | null;
}

