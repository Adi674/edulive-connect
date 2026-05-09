/**
 * src/components/room/StudentRoom.tsx
 *
 * Fixes:
 *  1. TS error removed: canPublishAudio uses canPublish directly (no canPublishSources).
 *  2. Screen share visible: onlySubscribed:true so teacher's remote tracks are received.
 *  3. Tab-visibility camera recovery via visibilitychange listener.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useLocalParticipant,
  useParticipants,
  useTracks,
  useRoomContext,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MessageSquare, PhoneOff } from "lucide-react";
import { LockedMicButton } from "./LockedMicButton";
import { ToolbarButton } from "./ToolbarButton";
import { ChatPanel } from "./ChatPanel";
import { ParticipantTile } from "./ParticipantTile";
import { RoomTopBar } from "./RoomTopBar";
import { MicStatusBanner } from "./Micstatusbanner";
import { leaveClassroom } from "@/lib/api";
import { useMicPermissionSync } from "@/hooks/usemicpermissionsync";
import { toast } from "sonner";

interface Props {
  classroomId: string;
  title: string;
}

export const StudentRoom = ({ classroomId, title }: Props) => {
  const navigate = useNavigate();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [chatOpen, setChatOpen] = useState(false);

  useMicPermissionSync({ classroomId, enabled: true });

  // Use canPublish directly — canPublishSources is not available on all SDK versions
  const canPublishAudio = localParticipant?.permissions?.canPublish ?? false;

  // onlySubscribed:true — receive all remote published tracks from teacher
  useTracks(
    [Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare],
    { onlySubscribed: true }
  );

  // Find active screen share from any remote participant
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: true });
  const activeScreen = screenTracks.find(
    (t) => t.publication?.track && !t.publication.isMuted
  );

  // Tab-visibility recovery: browser suspends MediaStream on hidden tabs.
  // On tab return, restart camera to clear the black frame.
  useEffect(() => {
    if (!room || !localParticipant) return;
    const recover = async () => {
      if (document.visibilityState !== "visible") return;
      const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub && !camPub.isMuted) {
        try {
          await localParticipant.setCameraEnabled(false);
          await localParticipant.setCameraEnabled(true);
        } catch { /* camera may not be on */ }
      }
    };
    document.addEventListener("visibilitychange", recover);
    return () => document.removeEventListener("visibilitychange", recover);
  }, [room, localParticipant]);

  const sorted = [
    ...participants.filter((p) => p.identity === localParticipant?.identity),
    ...participants.filter((p) => p.identity !== localParticipant?.identity),
  ];

  const onLeave = async () => {
    try { await leaveClassroom(classroomId); } catch { /* ignore */ }
    toast("You left the class");
    navigate("/dashboard");
  };

  return (
    <div className="room-dark flex h-screen w-full flex-col">
      <RoomTopBar title={title} onLeave={onLeave} />
      <MicStatusBanner canPublishAudio={canPublishAudio} />

      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-auto p-4">
          {activeScreen ? (
            <div className="h-full w-full overflow-hidden rounded-xl room-tile">
              <VideoTrack trackRef={activeScreen} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sorted.map((p) => (
                <ParticipantTile
                  key={p.sid || p.identity}
                  participant={p}
                  isLocal={p.identity === localParticipant?.identity}
                />
              ))}
              {sorted.length === 0 && (
                <div className="col-span-full flex h-64 items-center justify-center text-room-muted">
                  Waiting for the class to begin…
                </div>
              )}
            </div>
          )}
        </main>
        <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>

      <footer className="room-toolbar flex items-center justify-center gap-3 border-t border-[hsl(var(--room-tile-border))] px-4 py-3">
        <LockedMicButton />
        <ToolbarButton onClick={() => setChatOpen((o) => !o)} active={chatOpen} label="Chat">
          <MessageSquare className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton onClick={onLeave} variant="danger" label="Leave">
          <PhoneOff className="h-5 w-5" />
        </ToolbarButton>
      </footer>
    </div>
  );
};