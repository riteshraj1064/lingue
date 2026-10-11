
const AGENT_URL = (
    process.env.EXPO_PUBLIC_VISION_AGENT_URL ?? ""
).replace(/\/+$/, "");

export type StartAgentSessionParams = {
    callId: string;
    callType: string;
    userId: string;
};

export type AgentSessionResult = {
    sessionId?: string;
    raw: Record<string, any>;
};

function getSessionId(data: Record<string, any>): string | undefined {
    return (
        data.session_id ??
        data.sessionId ??
        data.id ??
        data.session?.id ??
        data.session?.session_id
    );
}

async function agentRequest(
    path: string,
    init: RequestInit,
): Promise<Record<string, any>> {
    if (!AGENT_URL) {
        throw new Error(
            "Missing EXPO_PUBLIC_VISION_AGENT_URL in your Expo .env file",
        );
    }

    const response = await fetch(`${AGENT_URL}${path}`, {
        ...init,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...init.headers,
        },
    });

    const responseText = await response.text();

    let data: Record<string, any> = {};

    try {
        data = responseText
            ? JSON.parse(responseText)
            : {};
    } catch {
        data = { message: responseText };
    }

    if (!response.ok) {
        console.error("[Agent API] Request failed:", {
            status: response.status,
            path,
            response: data,
        });

        throw new Error(
            data.detail ??
            data.error ??
            data.message ??
            `Vision Agent returned HTTP ${response.status}`,
        );
    }

    return data;
}

export async function startVisionAgentSession(
    params: StartAgentSessionParams,
): Promise<AgentSessionResult> {
    const { callId, callType, userId } = params;

    if (!callId || !callType || !userId) {
        throw new Error(
            "callId, callType and userId are required to start the AI agent",
        );
    }

    const path =
        `/calls/${encodeURIComponent(callId)}/sessions`;

    console.log("[Agent API] Starting Vision Agent:", {
        callId,
        callType,
        userId,
        path,
    });

    const data = await agentRequest(path, {
        method: "POST",
        body: JSON.stringify({
            call_type: callType,
            user_id: userId,
        }),
    });

    const sessionId = getSessionId(data);

    console.log("[Agent API] Start response:", {
        callId,
        sessionId,
        response: data,
    });

    return {
        sessionId,
        raw: data,
    };
}

export async function stopVisionAgentSession(params: {
    callId: string;
    callType: string;
    sessionId: string;
}): Promise<void> {
    const { callId, sessionId } = params;

    if (!AGENT_URL || !callId || !sessionId) {
        return;
    }

    const path =
        `/calls/${encodeURIComponent(callId)}/sessions/${encodeURIComponent(sessionId)}`;

    try {
        await agentRequest(path, {
            method: "DELETE",
        });

        console.log("[Agent API] Stop requested:", {
            callId,
            sessionId,
        });
    } catch (error) {
        console.warn(
            "[Agent API] Could not stop agent session:",
            error,
        );
    }
}
