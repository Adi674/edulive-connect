import { useEffect, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useParticipants } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { grantStudentMic, revokeStudentMic, getMicStatus } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Added missing import

interface Props {
  classroomId: string;
}

// Helper to get initials for avatars
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// Helper to determine the role from metadata
function tryRole(meta: string): string | null {
  try {
    const m = JSON.parse(meta);
    return m.role ?? null;
  } catch {
    return null;
  }
}

export const ParticipantSidebar = ({ classroomId }: Props) => {
  const participants = useParticipants();
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isSpeaking && !b.isSpeaking) return -1;
    if (!a.isSpeaking && b.isSpeaking) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  const [micPermissions, setMicPermissions] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // 1. Fetch initial permissions from backend
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const statuses = await getMicStatus(classroomId);
        const mapping = statuses.reduce((acc: any, curr: any) => {
          acc[curr.student_id] = curr.mic_granted;
          return acc;
        }, {});
        setMicPermissions(mapping);
      } catch (err) {
        console.error("Failed to fetch mic statuses", err);
      }
    };
    fetchPermissions();
  }, [classroomId]);

  const toggleMic = async (studentId: string, isCurrentlyGranted: boolean) => {
    setLoadingId(studentId);
    try {
      if (isCurrentlyGranted) {
        await revokeStudentMic(classroomId, studentId);
        setMicPermissions(prev => ({ ...prev, [studentId]: false }));
        toast.success("Mic access revoked");
      } else {
        await grantStudentMic(classroomId, studentId);
        setMicPermissions(prev => ({ ...prev, [studentId]: true }));
        toast.success("Mic access granted");
      }
    } catch (error) {
      toast.error("Failed to update mic access");
    } finally {
      setLoadingId(null);
    }
  };

  // The Fix: Use a return statement and wrap the content in a layout
  return (
    <div className="w-64 border-l border-room-tile-border bg-room-bg p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-white mb-4">Participants ({participants.length})</h3>
      <div className="space-y-3 overflow-y-auto">
        {sortedParticipants.map((p) => {
          const isGranted = micPermissions[p.identity] || false;
          const isLoading = loadingId === p.identity;
          const isSpeaking = p.isSpeaking;

          // Determine role for display
          const role = (p.metadata && tryRole(p.metadata)) || (p.permissions?.canPublish ? "Teacher" : "Student");

          return (
            <div
              key={p.sid}
              className={cn(
                "flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[hsl(var(--room-tile))]",
                isSpeaking && "bg-primary/5 ring-1 ring-primary/20"
              )}
            >
              <div className="flex items-center gap-2 text-sm overflow-hidden">
                {/* Avatar with Initials */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {initials(p.name || p.identity || "?")}
                </span>

                <div className="flex flex-col truncate">
                  <span className="font-medium text-white truncate">{p.name || p.identity}</span>
                  <span className="text-[10px] uppercase tracking-wide text-room-muted">{role}</span>
                </div>
              </div>

              {/* Clickable Mic Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full transition-colors",
                  isGranted ? 'text-primary' : 'text-room-muted',
                  isSpeaking && "animate-pulse"
                )}
                onClick={() => toggleMic(p.identity, isGranted)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isGranted ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};