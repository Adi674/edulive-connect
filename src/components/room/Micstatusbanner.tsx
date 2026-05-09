/**
 * src/components/room/MicStatusBanner.tsx
 *
 * Shown inside StudentRoom below the top bar.
 * Displays the current mic permission state so students always know
 * whether they can speak without having to guess from the locked mic icon.
 *
 * Props:
 *  canPublishAudio — derived from the LiveKit local participant's permissions.
 */
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    canPublishAudio: boolean;
}

export const MicStatusBanner = ({ canPublishAudio }: Props) => {
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