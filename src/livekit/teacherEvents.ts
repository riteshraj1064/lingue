// src/livekit/teacherEvents.ts
import { TeacherEvent } from "./livekitTypes";

/**
 * Decodes a raw event payload into a typed TeacherEvent.
 * Includes thorough console logging for error finding and diagnostics.
 */
export function parseTeacherEvent(
  payload: Uint8Array,
  topic?: string
): TeacherEvent | null {
  try {
    let text = "";
    if (typeof TextDecoder !== "undefined") {
      text = new TextDecoder().decode(payload);
    } else {
      let str = "";
      for (let i = 0; i < payload.length; i++) {
        str += String.fromCharCode(payload[i]);
      }
      try {
        text = decodeURIComponent(escape(str));
      } catch {
        text = str;
      }
    }

    if (!text || text.trim() === "") {
      console.warn("[teacher.events] Received empty payload, topic:", topic);
      return null;
    }

    const data = JSON.parse(text);
    console.log(`[teacher.events] [Topic: ${topic || "default"}] Parsed Event:`, data);

    return data as TeacherEvent;
  } catch (err) {
    console.error("[teacher.events] Failed to parse event payload:", {
      error: err,
      topic,
      payloadLength: payload.length,
    });
    return null;
  }
}
