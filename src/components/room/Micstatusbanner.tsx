/**
 * src/components/room/Micstatusbanner.tsx
 *
 * Now reads canPublishAudio from MicPermissionContext instead of props,
 * so it updates instantly when server pushes permission changes.
 * The prop variant is kept for backwards compat but context takes priority
 * when available.
 */
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMicPermission } from "./Micpermissioncontext";

interface Props {
    /** Kept for backwards compat — context value takes priority */
    canPublishAudio?: boolean;
}

export const MicStatusBanner = ({ canPublishAudio: propValue }: Props) => {
    // Context value is always up-to-date; fall back to prop if context unavailable
    const { canPublish } = useMicPermission();
    const canPublishAudio = canPublish ?? propValue ?? false;

    return (
        <div
            className={cn(
                "flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium transition-colors",
                canPublishAudio
                    ? "bg-[hsl(var(--speaking))]/15 text-[hsl(var(--speaking))]"
                    : "bg-[hsl(var(--room-tile))] text-room-muted",
            )}
        >
            {canPublishAudio ? (
                <>
                    <Mic className="h-3.5 w-3.5" />
                    Your microphone is enabled — you can unmute yourself
                </>
            ) : (
                <>
                    <MicOff className="h-3.5 w-3.5" />
                    Your microphone is disabled by the teacher
                </>
            )}
        </div>
    );
};