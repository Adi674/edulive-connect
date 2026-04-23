import { useParticipants } from "@livekit/components-react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  live?: boolean;
  onLeave: () => void;
  leaveLabel?: string;
}

export const RoomTopBar = ({ title, live, onLeave, leaveLabel = "Leave" }: Props) => {
  const participants = useParticipants();
  return (
    <header className="room-toolbar flex items-center justify-between border-b border-[hsl(var(--room-tile-border))] px-4 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-white">{title}</h1>
        {live && (
          <span className="live-badge flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            LIVE
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 rounded-full bg-[hsl(var(--room-tile))] px-3 py-1 text-xs text-room-muted">
        <Users className="h-3.5 w-3.5" />
        {participants.length} in call
      </div>
      <Button variant="destructive" size="sm" onClick={onLeave}>
        {leaveLabel}
      </Button>
    </header>
  );
};
