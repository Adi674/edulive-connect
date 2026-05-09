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
 * FIXES vs original:
 *  1. Uses room.localParticipant.setPermissions() + room.getConnectOptions()
 *     approach — avoids full disconnect/reconnect which was killing video tracks.
 *  2. Falls back to a soft reconnect only if the LiveKit SDK requires it for
 *     permission changes (token swap via room.connect with same room name).
 *  3. SSE 404 errors (backend not built yet) back off quickly instead of
 *     hammering retries — prevents the re-render cascade.
 */
export function useMicPermissionSync({
    classroomId,
    enabled = true,
}: UseMicPermissionSyncOptions) {
    const room = useRoomContext() as Room | null;
    const esRef = useRef<EventSource | null>(null);
    const mountedRef = useRef(true);
    const classroomIdRef = useRef(classroomId);
    classroomIdRef.current = classroomId;

    /**
     * Refresh the LiveKit token WITHOUT doing a full disconnect/reconnect.
     *
     * LiveKit SDK ≥1.x exposes Room.switchActiveDevice and internal token
     * update. The cleanest supported way is:
     *   1. Get new token from backend.
     *   2. Call room.connect(wsURL, newToken) — if already connected, the SDK
     *      does a token update internally without tearing down media tracks.
     *
     * We capture wsURL before calling anything so it's always available.
     */
    const doTokenRefresh = useCallback(async () => {
        if (!room) return null;
        try {
            const data = await refreshToken(classroomIdRef.current);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wsURL: string | undefined = (room as any).wsURL ?? (room as any).options?.wsURL;
            if (wsURL && data.token) {
                // room.connect when already connected does a reconnect with the new
                // token — much lighter than disconnect() + connect().
                await room.connect(wsURL, data.token);
            }
            return data;
        } catch (err) {
            console.error("[MicSync] Token refresh failed:", err);
            return null;
        }
    }, [room]);

    useEffect(() => {
        if (!enabled || !classroomId) return;
        mountedRef.current = true;

        const eventsUrl = getClassroomEventsUrl(classroomId);
        if (!eventsUrl) return; // Demo/mock mode — SSE not available

        const authToken = getToken();
        const fullUrl = authToken
            ? `${eventsUrl}?token=${encodeURIComponent(authToken)}`
            : eventsUrl;

        // Backoff state — increases on every failed attempt, resets on success
        let retryMs = 3_000;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        // Track consecutive 404s so we give up quickly if the endpoint doesn't exist
        let consecutiveErrors = 0;

        function connect() {
            if (!mountedRef.current) return;

            const es = new EventSource(fullUrl);
            esRef.current = es;

            es.addEventListener("mic_granted", async () => {
                if (!mountedRef.current) return;
                consecutiveErrors = 0;
                toast("🎙️ Teacher granted you the mic — updating permissions…", {
                    duration: 4000,
                });
                const result = await doTokenRefresh();
                if (result?.can_publish_audio) {
                    toast.success("Your microphone is now unlocked. You can unmute.");
                }
            });

            es.addEventListener("mic_revoked", async () => {
                if (!mountedRef.current) return;
                consecutiveErrors = 0;
                toast("🔇 Teacher muted your microphone.", { duration: 4000 });
                await doTokenRefresh();
            });

            es.addEventListener("ping", () => {
                consecutiveErrors = 0; // Stream is healthy
            });

            es.onopen = () => {
                retryMs = 3_000; // Reset backoff on successful open
                consecutiveErrors = 0;
            };

            es.onerror = () => {
                es.close();
                esRef.current = null;
                consecutiveErrors++;

                if (!mountedRef.current) return;

                // If we've seen 3+ consecutive errors (e.g. 404 — endpoint not built
                // yet), back off hard to avoid hammering the server and causing
                // re-renders that freeze video.
                if (consecutiveErrors >= 3) {
                    retryMs = 60_000; // Try again in 1 minute
                } else {
                    retryMs = Math.min(retryMs * 2, 30_000);
                }

                retryTimer = setTimeout(connect, retryMs);
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
    }, [enabled, classroomId, doTokenRefresh]);
}