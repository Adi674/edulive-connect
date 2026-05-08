import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalParticipant, useParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { MessageSquare, PhoneOff } from "lucide-react";
import { LockedMicButton } from "./LockedMicButton";
import { ToolbarButton } from "./ToolbarButton";
import { ChatPanel } from "./ChatPanel";
import { ParticipantTile } from "./ParticipantTile";
import { RoomTopBar } from "./RoomTopBar";
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
  const [chatOpen, setChatOpen] = useState(false);

  // Phase 4: Subscribe to SSE events so mic grant/revoke is instant
  // without the student needing to manually poll or rejoin.
  useMicPermissionSync({ classroomId, enabled: true });

  // Ensure local participant tile renders even before any tracks publish
  const sorted = [
    ...participants.filter((p) => p.identity === localParticipant?.identity),
    ...participants.filter((p) => p.identity !== localParticipant?.identity),
  ];

  // touch tracks subscription so tiles update
  useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: false });

  const onLeave = async () => {
    try {
      await leaveClassroom(classroomId);
    } catch {
      /* ignore */
    }
    toast("You left the class");
    navigate("/");
  };

  return (
    <div className="room-dark flex h-screen w-full flex-col">
      <RoomTopBar title={title} onLeave={onLeave} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-4">
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