/**
 * src/components/room/MicPermissionContext.tsx
 *
 * Single source of truth for the student's mic permission state.
 *
 * Why this exists:
 *   - useLocalParticipant() re-renders don't reliably fire when the server
 *     pushes ParticipantPermissionsChanged via WebSocket.
 *   - Multiple components need the same canPublish value (LockedMicButton,
 *     MicStatusBanner) — they must all update atomically.
 *   - We listen on RoomEvent.LocalParticipantPermissionsChanged on the Room
 *     object (not on localParticipant) which is the most reliable event source.
 *
 * Usage:
 *   Wrap StudentRoom children with <MicPermissionProvider>.
 *   Consume with useMicPermission() in any child component.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";


interface MicPermissionContextValue {
    canPublish: boolean;
}

const MicPermissionContext = createContext<MicPermissionContextValue>({ canPublish: false });

export function useMicPermission() {
    return useContext(MicPermissionContext);
}

export function MicPermissionProvider({ children }: { children: ReactNode }) {
    const room = useRoomContext();

    const [canPublish, setCanPublish] = useState<boolean>(
        room?.localParticipant?.permissions?.canPublish ?? false
    );

    useEffect(() => {
        if (!room) return;

        const onPermissionsChanged = () => {
            const next = room.localParticipant?.permissions?.canPublish ?? false;
            setCanPublish(next);
        };

        // FIX: Use the property name the compiler suggested
        room.on(RoomEvent.ParticipantPermissionsChanged, onPermissionsChanged);
        room.on(RoomEvent.Reconnected, onPermissionsChanged);

        return () => {
            room.off(RoomEvent.ParticipantPermissionsChanged, onPermissionsChanged);
            room.off(RoomEvent.Reconnected, onPermissionsChanged);
        };
    }, [room]);

    return (
        <MicPermissionContext.Provider value={{ canPublish }}>
            {children}
        </MicPermissionContext.Provider>
    );
}