/**
 * src/components/room/LockedMicButton.tsx
 *
 * Reads canPublish from MicPermissionContext (driven by RoomEvent on the Room
 * object) instead of reading directly from useLocalParticipant() which doesn't
 * reliably re-render on server-pushed permission changes.
 */
import { Mic, MicOff, Lock } from "lucide-react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { toast } from "sonner";
import { ToolbarButton } from "./ToolbarButton";
import { useMicPermission } from "./Micpermissioncontext";

export const LockedMicButton = () => {
  const { localParticipant } = useLocalParticipant();
  const { canPublish } = useMicPermission();

  const micPub = localParticipant?.getTrackPublication(Track.Source.Microphone);
  const micEnabled = !!micPub && !micPub.isMuted;

  const handle = async () => {
    if (!canPublish) {
      toast("🎙️ Your microphone is disabled by the teacher.", {
        description: "When the teacher opens mics, you'll be notified.",
      });
      return;
    }
    try {
      await localParticipant.setMicrophoneEnabled(!micEnabled);
    } catch {
      toast.error("Could not toggle microphone");
    }
  };

  return (
    <ToolbarButton
      onClick={handle}
      active={canPublish && micEnabled}
      label={canPublish ? (micEnabled ? "Mute" : "Unmute") : "Mic locked"}
    >
      <div className="relative">
        {canPublish && micEnabled ? (
          <Mic className="h-5 w-5" />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
        {!canPublish && (
          <Lock className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-destructive p-[1px] text-white" />
        )}
      </div>
    </ToolbarButton>
  );
};