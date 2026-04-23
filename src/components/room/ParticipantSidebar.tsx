import { useParticipants } from "@livekit/components-react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export const ParticipantSidebar = () => {
  const participants = useParticipants();
  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-room-muted">
        Participants ({participants.length})
      </h3>
      <ul className="space-y-1">
        {participants.map((p) => {
          const role = (p.metadata && tryRole(p.metadata)) || (p.permissions?.canPublish ? "Teacher" : "Student");
          const speaking = p.isSpeaking;
          return (
            <li
              key={p.sid}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[hsl(var(--room-tile))]"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {initials(p.name || p.identity || "?")}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-white">{p.name || p.identity}</span>
                  <span className="text-[10px] uppercase tracking-wide text-room-muted">{role}</span>
                </div>
              </div>
              <Mic
                className={cn(
                  "h-4 w-4",
                  speaking ? "text-[hsl(var(--speaking))]" : "text-room-muted/40",
                )}
              />
            </li>
          );
        })}
        {participants.length === 0 && (
          <li className="px-2 py-4 text-center text-xs text-room-muted">No one here yet</li>
        )}
      </ul>
    </div>
  );
};

function tryRole(meta: string): string | null {
  try {
    const m = JSON.parse(meta);
    return m.role ?? null;
  } catch {
    return null;
  }
}
