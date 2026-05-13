/**
 * src/hooks/usemicpermissionsync.tsx
 *
 * SSE-based mic permission sync for students.
 *
 * KEY FIX vs previous version:
 *   The old version called room.connect(wsURL, newToken) on every mic_granted
 *   event. In livekit-client, calling room.connect() while already connected
 *   triggers a FULL DISCONNECT + RECONNECT — this:
 *     1. Destroys the existing localParticipant instance
 *     2. Kills all subscribed tracks (teacher video goes black)
 *     3. Creates a new localParticipant, invalidating any event listeners
 *        attached to the old one
 *
 *   The backend already calls update_participant_permissions() via the LiveKit
 *   server API, which pushes a ParticipantPermissionsChanged signal directly
 *   over the existing WebSocket connection — NO token refresh needed.
 *   MicPermissionContext listens for RoomEvent.LocalParticipantPermissionsChanged
 *   and updates the UI immediately.
 *
 *   Token refresh is kept but ONLY updates the stored token for future
 *   reconnects — it does NOT call room.connect().
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getClassroomEventsUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useMicPermission } from "@/components/room/Micpermissioncontext";

interface UseMicPermissionSyncOptions {
    classroomId: string;
    enabled?: boolean;
}

export function useMicPermissionSync({
    classroomId,
    enabled = true,
}: UseMicPermissionSyncOptions) {
    const esRef = useRef<EventSource | null>(null);
    const mountedRef = useRef(true);
    const classroomIdRef = useRef(classroomId);
    classroomIdRef.current = classroomId;

    const { refresh } = useMicPermission();

    /**
     * Silently refresh the token from the backend and store it.
     * Does NOT call room.connect() — that would cause a full reconnect.
     * The permission change is already reflected in the UI via the LiveKit
     * WebSocket signal (update_participant_permissions → RoomEvent).
     */

    useEffect(() => {
        if (!enabled || !classroomId) return;
        mountedRef.current = true;

        const eventsUrl = getClassroomEventsUrl(classroomId);
        if (!eventsUrl) return;

        const authToken = getToken();
        const fullUrl = authToken
            ? `${eventsUrl}?token=${encodeURIComponent(authToken)}`
            : eventsUrl;

        let retryMs = 3_000;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let consecutiveErrors = 0;

        function connect() {
            if (!mountedRef.current) return;

            const es = new EventSource(fullUrl);
            esRef.current = es;

            es.addEventListener("mic_granted", () => {
                if (!mountedRef.current) return;
                consecutiveErrors = 0;
                toast.success("🎙️ Mic enabled — you can now unmute yourself", { duration: 4000 });
                refresh();
            });

            es.addEventListener("mic_revoked", () => {
                if (!mountedRef.current) return;
                consecutiveErrors = 0;
                toast("🔇 Teacher muted your microphone.", { duration: 4000 });
                refresh();
            });

            es.addEventListener("ping", () => {
                consecutiveErrors = 0;
            });

            es.onopen = () => {
                retryMs = 3_000;
                consecutiveErrors = 0;
            };

            es.onerror = () => {
                es.close();
                esRef.current = null;
                consecutiveErrors++;
                if (!mountedRef.current) return;
                retryMs = consecutiveErrors >= 3 ? 60_000 : Math.min(retryMs * 2, 30_000);
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
    }, [enabled, classroomId, refresh]);
}