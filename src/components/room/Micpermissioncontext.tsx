// src/components/room/Micpermissioncontext.tsx

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type LocalParticipant, type RemoteParticipant } from "livekit-client";
import { getMyMicState } from "@/lib/api";

interface MicPermissionContextValue {
    canPublish: boolean;
}

const MicPermissionContext = createContext<MicPermissionContextValue>({ canPublish: false });

export function useMicPermission() {
    return useContext(MicPermissionContext);
}

export function MicPermissionProvider({
    children,
    classroomId,  // ← add this prop
}: {
    children: ReactNode;
    classroomId: string;
}) {
    const room = useRoomContext();

    // Start with false — we'll fetch the real state immediately
    const [canPublish, setCanPublish] = useState<boolean>(false);

    // On mount: fetch real mic state from Redis via backend.
    // This is the source of truth — don't trust LiveKit's initial
    // permissions object which may reflect stale cached state.
    useEffect(() => {
        let cancelled = false;
        const fetchInitialState = async () => {
            try {
                const state = await getMyMicState(classroomId);
                if (!cancelled) {
                    setCanPublish(state.can_publish);
                }
            } catch {
                // fallback: read from LiveKit participant if API fails
                if (!cancelled) {
                    setCanPublish(room?.localParticipant?.permissions?.canPublish ?? false);
                }
            }
        };
        fetchInitialState();
        return () => { cancelled = true; };
    }, [classroomId, room]);

    // After mount: keep in sync via LiveKit WebSocket events (for changes)
    useEffect(() => {
        if (!room) return;

        const onPermissionsChanged = (
            _prev: unknown,
            participant: LocalParticipant | RemoteParticipant
        ) => {
            if (participant.sid !== room.localParticipant?.sid) return;
            const next = participant.permissions?.canPublish ?? false;
            setCanPublish(next);
        };

        const onReconnected = () => {
            // Re-fetch from backend on reconnect — LiveKit state may be stale
            getMyMicState(classroomId)
                .then(s => setCanPublish(s.can_publish))
                .catch(() => setCanPublish(room.localParticipant?.permissions?.canPublish ?? false));
        };

        room.on(RoomEvent.ParticipantPermissionsChanged, onPermissionsChanged as never);
        room.on(RoomEvent.Reconnected, onReconnected);

        return () => {
            room.off(RoomEvent.ParticipantPermissionsChanged, onPermissionsChanged as never);
            room.off(RoomEvent.Reconnected, onReconnected);
        };
    }, [room, classroomId]);

    return (
        <MicPermissionContext.Provider value={{ canPublish }}>
            {children}
        </MicPermissionContext.Provider>
    );
}