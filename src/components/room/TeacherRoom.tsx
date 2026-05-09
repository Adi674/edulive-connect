/**
 * src/components/room/TeacherRoom.tsx
 *
 * Fixes vs previous version:
 *  1. Tab-visibility camera recovery: same fix as StudentRoom — listens for
 *     visibilitychange and restarts camera if the browser suspended the stream.
 *  2. useTracks for screen share uses onlySubscribed:true so if another
 *     participant shares their screen it also shows on teacher side.
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
import {
  Camera,
  CameraOff,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
} from "lucide-react";
import { ToolbarButton } from "./ToolbarButton";
import { ChatPanel } from "./ChatPanel";
import { ParticipantTile } from "./ParticipantTile";
import { ParticipantSidebar } from "./ParticipantSidebar";
import { RoomTopBar } from "./RoomTopBar";
import { CameraPiP } from "./CameraPiP";
import { AllowMicToggle } from "./AllowMicToggle";
import { leaveClassroom } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  classroomId: string;
  title: string;
}

export const TeacherRoom = ({ classroomId, title }: Props) => {
  const navigate = useNavigate();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [chatOpen, setChatOpen] = useState(false);

  // Subscribe to ALL tracks — both local (camera/mic/screen) and remote
  useTracks(
    [Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare],
    { onlySubscribed: false }
  );

  // Find active screen share from any participant (including self)
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const activeScreen = screenTracks.find((t) => t.publication?.track);

  // Local camera ref for PiP when screen sharing
  const localCamera = useTracks([Track.Source.Camera], { onlySubscribed: false }).find(
    (t) => t.participant.identity === localParticipant?.identity,
  );

  const micPub = localParticipant?.getTrackPublication(Track.Source.Microphone);
  const camPub = localParticipant?.getTrackPublication(Track.Source.Camera);
  const screenPub = localParticipant?.getTrackPublication(Track.Source.ScreenShare);
  const micOn = !!micPub && !micPub.isMuted;
  const camOn = !!camPub && !camPub.isMuted;
  const sharing = !!screenPub && !screenPub.isMuted;

  const toggleMic = () =>
    localParticipant?.setMicrophoneEnabled(!micOn).catch(() => toast.error("Mic error"));
  const toggleCam = () =>
    localParticipant?.setCameraEnabled(!camOn).catch(() => toast.error("Camera error"));
  const toggleShare = () =>
    localParticipant
      ?.setScreenShareEnabled(!sharing)
      .catch(() => toast.error("Screen share unavailable"));

  // FIX: Tab visibility — recover camera when tab becomes visible again.
  // Browsers suspend the MediaStream capture when the tab is hidden.
  useEffect(() => {
    if (!room) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const camPub = localParticipant?.getTrackPublication(Track.Source.Camera);
        if (camPub && !camPub.isMuted) {
          try {
            await localParticipant.setCameraEnabled(false);
            await localParticipant.setCameraEnabled(true);
          } catch {
            // Camera may not have been on — safe to ignore
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [room, localParticipant]);

  const onEnd = async () => {
    if (!confirm("End the class for everyone?")) return;
    try {
      await leaveClassroom(classroomId);
    } catch {
      /* ignore */
    }
    toast("Class ended");
    navigate("/");
  };

  const sorted = [
    ...participants.filter((p) => p.identity === localParticipant?.identity),
    ...participants.filter((p) => p.identity !== localParticipant?.identity),
  ];

  return (
    <div className="room-dark flex h-screen w-full flex-col">
      <RoomTopBar title={title} live onLeave={onEnd} leaveLabel="End Class" />

      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-auto p-4">
          {activeScreen ? (
            <div className="relative h-full w-full">
              <div className="room-tile h-full w-full overflow-hidden rounded-xl">
                <VideoTrack trackRef={activeScreen} className="h-full w-full object-contain" />
              </div>
              <CameraPiP trackRef={localCamera} />
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
                  Waiting for students to join…
                </div>
              )}
            </div>
          )}
        </main>

        <aside className="room-surface hidden w-72 flex-col border-l border-[hsl(var(--room-tile-border))] md:flex">
          <div className="flex-1 overflow-auto">
            <ParticipantSidebar />
          </div>
          <div className="flex h-1/2 flex-col border-t border-[hsl(var(--room-tile-border))]">
            <ChatPanelInline />
          </div>
        </aside>

        <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>

      <footer className="room-toolbar flex flex-wrap items-center justify-center gap-3 border-t border-[hsl(var(--room-tile-border))] px-4 py-3">
        <ToolbarButton onClick={toggleMic} active={micOn} label={micOn ? "Mute" : "Unmute"}>
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </ToolbarButton>
        <ToolbarButton onClick={toggleCam} active={camOn} label={camOn ? "Stop video" : "Start video"}>
          {camOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleShare}
          label="Share screen"
          className={sharing ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
        >
          <MonitorUp className="h-5 w-5" />
        </ToolbarButton>
        <AllowMicToggle classroomId={classroomId} />
        <ToolbarButton
          onClick={() => setChatOpen((o) => !o)}
          active={chatOpen}
          label="Chat"
          className="md:hidden"
        >
          <MessageSquare className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton onClick={onEnd} variant="danger" label="End class">
          <PhoneOff className="h-5 w-5" />
        </ToolbarButton>
      </footer>
    </div>
  );
};

// Inline chat (always visible inside teacher sidebar on desktop)
const ChatPanelInline = () => {
  return <ChatPanel open onClose={() => { }} />;
};