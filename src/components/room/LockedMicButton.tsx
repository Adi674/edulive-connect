import { Mic, MicOff, Lock } from "lucide-react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { toast } from "sonner";
import { ToolbarButton } from "./ToolbarButton";

export const LockedMicButton = () => {
  const { localParticipant } = useLocalParticipant();
  const canPublish = localParticipant?.permissions?.canPublish ?? false;
  const micPub = localParticipant?.getTrackPublication(Track.Source.Microphone);
  const micEnabled = !!micPub && !micPub.isMuted;

  const handle = async () => {
    if (!canPublish) {
      toast("🎙️ Your microphone is disabled by the teacher.", {
        description: "When the teacher opens mics, rejoin to start speaking.",
      });
      return;
    }
    try {
      await localParticipant.setMicrophoneEnabled(!micEnabled);
    } catch (e) {
      toast.error("Could not toggle microphone");
    }
  };

  return (
    <ToolbarButton onClick={handle} active={canPublish && micEnabled} label={canPublish ? (micEnabled ? "Mute" : "Unmute") : "Mic locked"}>
      <div className="relative">
        {canPublish && micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        {!canPublish && (
          <Lock className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-destructive p-[1px] text-white" />
        )}
      </div>
    </ToolbarButton>
  );
};
