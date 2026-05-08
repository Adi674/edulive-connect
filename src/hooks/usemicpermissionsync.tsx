import { useEffect, useRef, useCallback } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Room } from "livekit-client";
import { toast } from "sonner";
import { refreshToken, getClassroomEventsUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface UseMicPermissionSyncOptions {
    classroomId: string;
    /** Only activate for students */
    enabled?: boolean;
}

/**
 * Phase 4 — SSE-based mic permission sync.
 *
 * Subscribes to GET /classrooms/{id}/events (Server-Sent Events).
 * When the teacher grants/revokes mic for this student, the server pushes
 * a "mic_granted" or "mic_revoked" event. We then:
 *   1. Call GET /classrooms/{id}/token/refresh to get a fresh LiveKit JWT.
 *   2. Disconnect from the LiveKit room.
 *   3. Reconnect with the new token.
 *
 * Falls back gracefully when VITE_API_URL is not set (demo mode).
 */
export function useMicPermissionSync({ classroomId, enabled = true }: UseMicPermissionSyncOptions) {
    const room = useRoomContext() as Room | null;
    const esRef = useRef<EventSource | null>(null);
    const mountedRef = useRef(true);
    const classroomIdRef = useRef(classroomId);
    classroomIdRef.current = classroomId;

    const doTokenRefreshAndReconnect = useCallback(async () => {
        if (!room) return null;
        try {
            const data = await refreshToken(classroomIdRef.current);
            // Capture the WS URL before disconnect
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wsURL: string | undefined = (room as any).wsURL;
            await room.disconnect();
            if (wsURL && data.token) {
                await room.connect(wsURL, data.token);
            }
            return data;
        } catch (err) {
            console.error("[MicSync] Token refresh/reconnect failed:", err);
            return null;
        }
    }, [room]);

    useEffect(() => {
        if (!enabled || !classroomId) return;
        mountedRef.current = true;

        const eventsUrl = getClassroomEventsUrl(classroomId);
        if (!eventsUrl) return; // Demo/mock mode — SSE not available

        const authToken = getToken();
        // EventSource does not support custom headers; pass bearer token as query param.
        const fullUrl = authToken
            ? `${eventsUrl}?token=${encodeURIComponent(authToken)}`
            : eventsUrl;

        let retryMs = 3000;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;

        function connect() {
            if (!mountedRef.current) return;

            const es = new EventSource(fullUrl);
            esRef.current = es;

            es.addEventListener("mic_granted", async () => {
                if (!mountedRef.current) return;
                toast("🎙️ Teacher granted you the mic — reconnecting…", { duration: 4000 });
                const result = await doTokenRefreshAndReconnect();
                if (result?.can_publish_audio) {
                    toast.success("Your microphone is now unlocked. You can unmute.");
                }
            });

            es.addEventListener("mic_revoked", async () => {
                if (!mountedRef.current) return;
                toast("🔇 Teacher muted your microphone.", { duration: 4000 });
                await doTokenRefreshAndReconnect();
            });

            // Server sends periodic keepalive pings — ignore them
            es.addEventListener("ping", () => { /* noop */ });

            es.onopen = () => {
                retryMs = 3000; // reset backoff on successful connection
            };

            es.onerror = () => {
                es.close();
                esRef.current = null;
                if (mountedRef.current) {
                    retryTimer = setTimeout(() => {
                        retryMs = Math.min(retryMs * 2, 30_000); // exponential backoff, cap 30s
                        connect();
                    }, retryMs);
                }
            };
        }

        connect();

        return () => {
            mountedRef.current = false;
            if (esRef.current) {
                esRef.current.close();
                esRef.current = null;
            }
            if (retryTimer) clearTimeout(retryTimer);
        };
    }, [enabled, classroomId, doTokenRefreshAndReconnect]);
}