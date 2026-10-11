// Stream Video SDK implementation for AI Teacher calls
// Public API is identical: connect(url, token), disconnect(), setMicrophoneEnabled(), sendControlMessage(), setSpeakerphone()

import {
  Call,
  StreamVideoClient,
  StreamVideoEvent,
} from "@stream-io/video-react-native-sdk";
import { TeacherControlMessage, TeacherEvent } from "./livekitTypes";
import { parseTeacherEvent } from "./teacherEvents";

export interface LiveTeacherClientOptions {
  onConnected?: () => void;
  onDisconnected?: (reason?: string) => void;
  onError?: (error: Error) => void;
  onTeacherEvent?: (event: TeacherEvent) => void;
  onActiveSpeakersChanged?: (speakers: any[]) => void;
  onTrackSubscribed?: (track: any, participant: any) => void;
}

/**
 * LiveTeacherClient (Stream Video SDK implementation)
 *
 * Stream Video Client for real-time AI teacher session.
 * The connect(url, token) method signature accepts:
 *   - url   → Stream API key  (provided by the backend in stream.api_key field)
 *   - token → "<userToken>|<callType>/<callId>"
 *             e.g. "eyJhb...token...|default/room-abc123"
 *
 * Control messages are sent via call.sendCustomEvent({ type: "teacher.control", ... })
 * Teacher events are received via call.on("custom", ...) on the teacher.event channel.
 */
export class LiveTeacherClient {
  private streamClient: StreamVideoClient | null = null;
  private call: Call | null = null;
  private options: LiveTeacherClientOptions;
  private isConnecting: boolean = false;
  private isSpeakerOn: boolean = true;

  // ── mic state tracking for fire-and-forget PTT ───────────────────────────
  private micEnabled: boolean = false;
  private pendingMicOp: Promise<void> | null = null;

  // Unsubscribe callbacks from event listeners
  private eventUnsubs: Array<() => void> = [];

  constructor(options: LiveTeacherClientOptions = {}) {
    this.options = options;
  }

  public getCall(): Call | null {
    return this.call;
  }

  /** @deprecated — kept for compatibility, returns null */
  public getRoom(): null {
    return null;
  }

  public isConnected(): boolean {
    return this.call !== null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AUDIO SESSION (React Native InCallManager / Stream SDK handles this)
  // ──────────────────────────────────────────────────────────────────────────

  private async setupAudioSession(): Promise<void> {
    // Stream SDK handles audio session internally via @stream-io/react-native-webrtc.
    // No manual AudioSession setup is needed for Stream SDK.
    console.log("[LiveTeacherClient] Stream SDK manages audio session automatically.");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SPEAKER OUTPUT
  // ──────────────────────────────────────────────────────────────────────────

  public async setSpeakerphone(enable: boolean): Promise<void> {
    this.isSpeakerOn = enable;
    try {
      // Stream SDK / InCallManager — if available in the build
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const InCallManager = require("react-native-incall-manager");
      if (InCallManager?.default?.setSpeakerphoneOn) {
        InCallManager.default.setSpeakerphoneOn(enable);
        console.log(`[LiveTeacherClient] Speaker → ${enable ? "ON" : "OFF"}`);
      }
    } catch {
      // InCallManager may not be available — speaker routing handled by OS
      console.log(`[LiveTeacherClient] setSpeakerphone skipped (InCallManager not available): ${enable}`);
    }
  }

  public getIsSpeakerOn(): boolean {
    return this.isSpeakerOn;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CONNECT
  // url   = Stream API key (from backend stream.api_key field)
  // token = "<userToken>|<callType>/<callId>"
  // ──────────────────────────────────────────────────────────────────────────

  public async connect(
    url: string,
    token: string,
    userId: string,
  ): Promise<void> {
    if (this.isConnecting) {
      console.warn("[LiveTeacherClient] Connection already in progress.");
      return;
    }

    this.isConnecting = true;
    console.log("[LiveTeacherClient] Connecting via Stream Video SDK...");

    try {
      await this.setupAudioSession();

      if (this.streamClient || this.call) {
        await this.disconnect();
      }

      // ── Parse the token field ────────────────────────────────────────────
      // Backend encodes: "<streamUserToken>|<callType>/<callId>"
      // e.g. "eyJ...token...|default/lesson-room-abc"
      // If the separator is missing, treat whole string as token and use defaults
      let userToken = token;
      let callType = "default";
      let callId = url; // fallback: treat url as callId

      if (token.includes("|")) {
        const [t, callPath] = token.split("|");
        userToken = t.trim();
        const parts = callPath.trim().split("/");
        if (parts.length >= 2) {
          callType = parts[0];
          callId = parts.slice(1).join("/");
        } else {
          callId = callPath.trim();
        }
      }

      // ── Parse Stream API key from URL ─────────────────────────────────────
      // Backend puts API key in the url field
      const apiKey = url;

      console.log("[LiveTeacherClient] Stream connection params:", {
        apiKey: apiKey.substring(0, 8) + "...",
        callType,
        callId,
        tokenPrefix: userToken.substring(0, 20) + "...",
      });

      // ── Create StreamVideoClient ─────────────────────────────────────────
      const client = new StreamVideoClient({
        apiKey,
        token: userToken,
        user: {
          id: userId,
        },
      });

      this.streamClient = client;

      // ── Get the call reference ───────────────────────────────────────────
      const call = client.call(callType, callId);
      this.call = call;

      // ── Attach event listeners BEFORE join ──────────────────────────────
      this.attachEventListeners(call);

      // ── Join the call (audio-only: no video) ─────────────────────────────
      await call.join({
        create: false,
        ring: false,
        notify: false,
      });

      // Do not report "connected" until the AI participant is present.
      await this.waitForAgent(call, "ai-teacher", 25000);

      this.isConnecting = false;
      console.log(
        "[LiveTeacherClient] Student and AI agent are in the call:",
        callId,
      );

      // ── Disable camera (audio-only session) ─────────────────────────────
      try {
        await call.camera.disable();
      } catch { }

      // ── Pre-publish mic muted (stopMicTrackOnMute: false) ──
      // Enable mic first (triggers getUserMedia once), then immediately mute.
      // All future PTT press/releases just enable/disable without re-negotiation.
      try {
        await call.microphone.enable();
        await new Promise<void>((r) => setTimeout(r, 80));
        await call.microphone.disable();
        this.micEnabled = false;
        console.log("[LiveTeacherClient] Mic pre-published & muted (PTT ready).");
      } catch (micErr: any) {
        console.warn("[LiveTeacherClient] Mic pre-publish warning:", micErr?.message || micErr);
      }

      // ── Apply speaker routing ────────────────────────────────────────────
      await this.setSpeakerphone(this.isSpeakerOn);

      // ── Notify connected ─────────────────────────────────────────────────
      this.options.onConnected?.();
    } catch (err: any) {
      this.isConnecting = false;
      console.error("[LiveTeacherClient] Stream connection failed:", err);
      this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }


  public async updateCallCustomData(
    customData: Record<string, unknown>,
  ): Promise<void> {
    if (!this.call) {
      throw new Error(
        "[LiveTeacherClient] Cannot update custom data: call is not initialized.",
      );
    }

    await this.call.update({
      custom: customData,
    });

    console.log("[LiveTeacherClient] Call custom data updated:", {
      keys: Object.keys(customData),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DISCONNECT
  // ──────────────────────────────────────────────────────────────────────────

  public async disconnect(): Promise<void> {
    console.log("[LiveTeacherClient] Disconnecting...");

    // Remove all event listeners first
    this.eventUnsubs.forEach((unsub) => { try { unsub(); } catch { } });
    this.eventUnsubs = [];

    try {
      if (this.call) {
        await this.call.leave();
        console.log("[LiveTeacherClient] Left Stream call.");
      }
    } catch (err) {
      console.warn("[LiveTeacherClient] Error leaving call:", err);
    } finally {
      this.call = null;
    }

    try {
      if (this.streamClient) {
        await this.streamClient.disconnectUser();
        console.log("[LiveTeacherClient] Stream client disconnected.");
      }
    } catch (err) {
      console.warn("[LiveTeacherClient] Error disconnecting client:", err);
    } finally {
      this.streamClient = null;
      this.isConnecting = false;
      this.micEnabled = false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MICROPHONE — FIRE-AND-FORGET PTT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * SPEED OPTIMISATION — Fire-and-forget mic toggle.
   * Sends speech state control messages immediately, then serializes the
   * actual enable/disable op to prevent rapid press/release race conditions.
   */
  public setMicrophoneEnabled(enabled: boolean): void {
    if (!this.call) {
      console.warn("[LiveTeacherClient] Cannot toggle mic: not connected.");
      return;
    }

    // Avoid issuing duplicate ops for the same state
    if (this.micEnabled === enabled) return;
    this.micEnabled = enabled;

    // Immediately signal the AI agent to speed up response
    const action = enabled ? "user_started_speaking" : "user_stopped_speaking";
    this.sendControlMessage(action).catch(() => { });
    if (!enabled) {
      // Commit signal — tells the AI to stop waiting for silence and answer now
      this.sendControlMessage("commit").catch(() => { });
    }

    // Serialize the actual mic OS operation to preserve press/release order
    this.pendingMicOp = (this.pendingMicOp ?? Promise.resolve())
      .then(async () => {
        if (!this.call) return;
        if (enabled) {
          await this.call.microphone.enable();
        } else {
          await this.call.microphone.disable();
        }
        console.log(`[LiveTeacherClient] Mic → ${enabled ? "ON" : "OFF"}`);
      })
      .catch((err) => {
        console.error("[LiveTeacherClient] Mic toggle error:", err);
      });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CONTROL MESSAGE (teacher.control custom event)
  // ──────────────────────────────────────────────────────────────────────────

  public async sendControlMessage(action: TeacherControlMessage["action"]): Promise<void> {
    if (!this.call) {
      return;
    }

    try {
      console.log("[LiveTeacherClient] Sending control:", action);
      await this.call.sendCustomEvent({
        type: "teacher.control",
        custom: { action } satisfies TeacherControlMessage,
      });
    } catch (err: any) {
      const msg = String(err);
      if (
        msg.includes("call left") ||
        msg.includes("disconnected") ||
        msg.includes("closed")
      ) {
        console.warn("[LiveTeacherClient] Control message skipped — call already closed:", msg);
      } else {
        console.error("[LiveTeacherClient] Control message error:", err);
      }
    }
  }



  private async waitForAgent(
    call: Call,
    agentUserId: string,
    timeoutMs = 25000,
  ): Promise<void> {
    const hasAgent = (): boolean => {
      const remoteParticipants: any =
        (call.state as any)?.remoteParticipants;

      const participants: any[] = Array.isArray(remoteParticipants)
        ? remoteParticipants
        : remoteParticipants &&
          typeof remoteParticipants.values === "function"
          ? Array.from(remoteParticipants.values())
          : [];

      return participants.some((participant: any) => {
        const id =
          participant?.userId ??
          participant?.user?.id ??
          participant?.id;

        return id === agentUserId;
      });
    };

    if (hasAgent()) {
      console.log("[LiveTeacherClient] AI agent already joined.");
      return;
    }

    console.log(
      `[LiveTeacherClient] Waiting for AI agent "${agentUserId}"...`,
    );

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let unsubscribe: (() => void) | undefined;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;

        clearTimeout(timeout);
        unsubscribe?.();

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        finish(
          new Error(
            `AI agent "${agentUserId}" did not join the Stream call within ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      unsubscribe = call.on(
        "call.session_participant_joined",
        ((event: any) => {
          const participant = event?.participant;

          const joinedUserId =
            participant?.userId ??
            participant?.user?.id ??
            participant?.id;

          if (joinedUserId === agentUserId) {
            console.log(
              "[LiveTeacherClient] AI agent participant joined:",
              joinedUserId,
            );
            finish();
          }
        }) as any,
      );

      // Check again in case the agent joined while we attached the listener.
      if (hasAgent()) {
        finish();
      }
    });
  }


  // ──────────────────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ──────────────────────────────────────────────────────────────────────────

  private attachEventListeners(call: Call): void {
    // ── Call joined (session ready) ──────────────────────────────────────
    // onConnected is called after join() resolves — no event-based trigger needed.

    // ── Call ended / left by other participant ──────────────────────────
    const onCallEnded = (event: StreamVideoEvent) => {
      console.log("[LiveTeacherClient] call.ended event received:", event);
      this.options.onDisconnected?.("Call ended by host.");
    };
    const unsubCallEnded = call.on("call.ended", onCallEnded as any);
    this.eventUnsubs.push(unsubCallEnded);

    // ── Session rejected / errors ────────────────────────────────────────
    const onSessionRejected = (event: StreamVideoEvent) => {
      console.warn("[LiveTeacherClient] call.session_participant_left:", event);
    };
    const unsubRejected = call.on("call.session_participant_left", onSessionRejected as any);
    this.eventUnsubs.push(unsubRejected);

    // ── Custom events (teacher events & control messages from AI) ────────
    const onCustomEvent = (event: any) => {
      console.log("[LiveTeacherClient] Custom event received:", event?.type, event?.custom || event?.data || event);

      // 1. Check if event itself or event.custom or event.data is the payload
      const payload = event?.custom ?? event?.data ?? event;

      if (payload && typeof payload === "object" && payload.type) {
        this.options.onTeacherEvent?.(payload as TeacherEvent);
        return;
      }

      // 2. Handle teacher.event wrapper
      if (event?.type === "teacher.event" && event?.custom) {
        const parsed = event.custom as TeacherEvent;
        if (parsed?.type) {
          this.options.onTeacherEvent?.(parsed);
          return;
        }
      }

      // 3. Fallback: try to parse from encoded data bytes
      if (event?.data && typeof event.data === "string") {
        try {
          const bytes = new Uint8Array(
            atob(event.data).split("").map((c) => c.charCodeAt(0))
          );
          const parsed = parseTeacherEvent(bytes, event?.type);
          if (parsed) {
            this.options.onTeacherEvent?.(parsed);
          }
        } catch { }
      }
    };
    const unsubCustom = call.on("custom", onCustomEvent as any);
    this.eventUnsubs.push(unsubCustom);

    // ── Dominant speaker changed (active speakers) ───────────────────────
    const onDominantSpeaker = (event: any) => {
      const participants = call.state?.remoteParticipants ?? [];
      this.options.onActiveSpeakersChanged?.(participants);
    };
    const unsubDominant = call.on("dominantSpeakerChanged" as any, onDominantSpeaker as any);
    this.eventUnsubs.push(unsubDominant);

    // ── Participant joined (track subscribed equivalent) ─────────────────
    const onParticipantJoined = (event: any) => {
      console.log("[LiveTeacherClient] Participant joined:", event?.participant?.userId);
      const participant = event?.participant;
      if (participant && participant.userId !== "user") {
        this.setSpeakerphone(this.isSpeakerOn);
        this.options.onTrackSubscribed?.(null, participant);
      }
    };
    const unsubJoined = call.on("call.session_participant_joined", onParticipantJoined as any);
    this.eventUnsubs.push(unsubJoined);
  }
}



