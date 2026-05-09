import { useEffect, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useParticipants } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { grantStudentMic, revokeStudentMic, getMicStatus } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  classroomId: string;
}

export const ParticipantSidebar = ({ classroomId }: Props) => {
  const participants = useParticipants();
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
    // Optional: Set up an interval or listen for SSE to keep this updated
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

  return (
    <div className="w-64 border-l border-room-tile-border bg-room-bg p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-white mb-4">Participants ({participants.length})</h3>
      <div className="space-y-3 overflow-y-auto">
        {participants.map((p) => {
          const isGranted = micPermissions[p.identity] || false;
          const isLoading = loadingId === p.identity;

          return (
            <div key={p.sid} className="flex items-center justify-between group">
              <span className="text-sm text-room-muted truncate pr-2">
                {p.name || p.identity}
              </span>

              {/* The Fix: Make it a clickable Button */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full ${isGranted ? 'text-primary' : 'text-room-muted'}`}
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