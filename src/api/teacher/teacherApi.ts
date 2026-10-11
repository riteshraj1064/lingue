// src/api/teacher/teacherApi.ts
import { supabase } from "@/services/supabase";
import { TeacherSessionRequest, TeacherSessionResponse } from "./teacherTypes";

const DEFAULT_SUPABASE_URL = "https://fcwfzxwhaaocxbwobeay.supabase.co";

/**
 * Calls the Supabase Edge Function to start a teacher session.
 * Includes detailed console logging for error finding and debugging.
 */
export async function startTeacherSession(
  body: TeacherSessionRequest
): Promise<TeacherSessionResponse> {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const endpoint = `${supabaseUrl}/functions/v1/teacher-session`;

  console.log("[TeacherAPI] === STARTING TEACHER SESSION ===");
  console.log("[TeacherAPI] Endpoint:", endpoint);
  console.log("[TeacherAPI] Request Body:", JSON.stringify(body, null, 2));

  // 1. Authenticate user session
  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError) {
    console.error("[TeacherAPI] Auth Session Retrieval Error:", authError);
    throw new Error(`Authentication error: ${authError.message}`);
  }

  if (!session?.access_token) {
    console.error("[TeacherAPI] No access token found. User is not logged in.");
    throw new Error("User is not authenticated. Please log in first.");
  }

  console.log("[TeacherAPI] User Authenticated:", {
    userId: session.user?.id,
    tokenPrefix: session.access_token.substring(0, 15) + "...",
  });

  // 2. Execute POST request with payload support for camelCase and snake_case
  const payload = {
    ...body,
    nativeLanguage: body.native_language || (body as any).nativeLanguage,
    targetLanguage: body.target_language || (body as any).targetLanguage,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr: any) {
    console.error("[TeacherAPI] Network request failed:", networkErr);
    throw new Error(
      `Network error contacting teacher service: ${networkErr?.message || networkErr}`
    );
  }

  console.log("[TeacherAPI] Response Status:", response.status, response.statusText);

  // 3. Parse JSON response
  let result: any;
  try {
    result = await response.json();
  } catch (jsonErr) {
    console.error("[TeacherAPI] Failed to parse response JSON:", jsonErr);
    throw new Error("Invalid response format from teacher service");
  }

  console.log("[TeacherAPI] Response Body:", JSON.stringify(result, null, 2));

  // 4. Handle HTTP errors
  if (!response.ok) {
    const errorMsg =
      result?.error ||
      result?.message ||
      `Failed to start AI Teacher (HTTP ${response.status})`;
    console.error("[TeacherAPI] Teacher session creation failed:", {
      status: response.status,
      errorMsg,
      result,
    });
    throw new Error(errorMsg);
  }

  // 5. Validate Stream API credentials in response
  if (!result?.stream?.api_key || !result?.stream?.token) {
    console.error(
      "[TeacherAPI] Missing Stream credentials in response:",
      result
    );
    throw new Error("Missing Stream connection credentials from server");
  }

  console.log("[TeacherAPI] Teacher Session successfully initialized:", {
    sessionId: result.session?.id,
    callId: result.stream.call_id,
    apiKey: result.stream.api_key,
  });

  return result as TeacherSessionResponse;
}
