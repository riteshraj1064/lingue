import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

export async function POST(request: Request) {
    try {
        // ============================================
        // 1. Validate environment variables
        // ============================================


        if (!SUPABASE_URL) {
            console.error("Missing SUPABASE_URL");

            return Response.json(
                {
                    error: "Server configuration error",
                },
                { status: 500 }
            );
        }

        if (!SUPABASE_ANON_KEY) {
            console.error("Missing SUPABASE_ANON_KEY");

            return Response.json(
                {
                    error: "Server configuration error",
                },
                { status: 500 }
            );
        }

        if (!STREAM_API_KEY) {
            console.error("Missing STREAM_API_KEY");

            return Response.json(
                {
                    error: "Server configuration error",
                },
                { status: 500 }
            );
        }

        if (!STREAM_API_SECRET) {
            console.error("Missing STREAM_API_SECRET");

            return Response.json(
                {
                    error: "Server configuration error",
                },
                { status: 500 }
            );
        }

        // ============================================
        // 2. Get Authorization header
        // ============================================

        const authorization =
            request.headers.get("authorization");

        if (!authorization) {
            return Response.json(
                {
                    error: "Missing Authorization header",
                },
                { status: 401 }
            );
        }

        // Expected:
        //
        // Authorization: Bearer eyJ...
        //

        const match =
            authorization.match(/^Bearer\s+(.+)$/i);

        if (!match) {
            return Response.json(
                {
                    error: "Invalid Authorization header",
                },
                { status: 401 }
            );
        }

        const accessToken = match[1];

        if (!accessToken) {
            return Response.json(
                {
                    error: "Missing access token",
                },
                { status: 401 }
            );
        }

        // ============================================
        // 3. Create Supabase client
        //
        // IMPORTANT:
        // No SERVICE_ROLE_KEY is used.
        // ============================================

        const supabase = createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );

        // ============================================
        // 4. Validate Supabase access token
        // ============================================

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser(accessToken);

        if (userError) {
            console.error(
                "Supabase getUser error:",
                userError.message
            );

            return Response.json(
                {
                    error: "Invalid or expired Supabase session",
                },
                { status: 401 }
            );
        }

        if (!user) {
            return Response.json(
                {
                    error: "User not found",
                },
                { status: 401 }
            );
        }

        // ============================================
        // 5. Get Supabase user ID
        // ============================================

        const userId = user.id;

        if (!userId) {
            return Response.json(
                {
                    error: "User ID not found",
                },
                { status: 401 }
            );
        }

        // ============================================
        // 6. Generate Stream JWT
        // ============================================

        const now = Math.floor(Date.now() / 1000);

        // Allow a small amount of clock skew between
        // your server and Stream servers.
        const issuedAt = now - 60;

        const expiresAt = now + 60 * 60;

        const header = {
            alg: "HS256",
            typ: "JWT",
        };

        const payload = {
            user_id: userId,
            iat: issuedAt,
            exp: expiresAt,
        };

        const base64UrlEncode = (value: string): string => {
            return Buffer.from(value)
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=/g, "");
        };

        const encodedHeader = base64UrlEncode(
            JSON.stringify(header)
        );

        const encodedPayload = base64UrlEncode(
            JSON.stringify(payload)
        );

        const unsignedToken =
            `${encodedHeader}.${encodedPayload}`;

        const signature = createHmac(
            "sha256",
            STREAM_API_SECRET
        )
            .update(unsignedToken)
            .digest("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "");

        const token =
            `${unsignedToken}.${signature}`;

        // ============================================
        // 10. Return Stream credentials
        // ============================================

        return Response.json({
            success: true,

            token,

            apiKey: STREAM_API_KEY,

            userId,

            expiresAt: expiresAt,
        });
    } catch (error) {
        console.error(
            "stream-token error:",
            error
        );

        return Response.json(
            {
                error: "Failed to generate Stream token",
            },
            { status: 500 }
        );
    }
}