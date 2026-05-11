/**
 * src/components/room/RecordingButton.tsx
 *
 * Phase 5 — Recording control button for TeacherRoom toolbar.
 *
 * Shows:
 *  - Grey "Record" button when not recording
 *  - Red pulsing dot + "Stop Recording" when active
 *  - Loading spinner during API calls
 *
 * Usage in TeacherRoom footer:
 *   <RecordingButton classroomId={classroomId} />
 */
import { useState } from "react";
import { Circle, StopCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
    classroomId: string;
}

// Inline API calls to avoid circular import issues if api.ts is not yet updated
async function callRecording(classroomId: string, action: "start" | "stop") {
    const token = sessionStorage.getItem("edulive_token");
    const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
    if (!API_URL) throw new Error("No API_URL configured");

    const res = await fetch(`${API_URL}/classrooms/${classroomId}/recording/${action}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Recording ${action} failed`);
    }
    return res.json();
}

export const RecordingButton = ({ classroomId }: Props) => {
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        setLoading(true);
        try {
            if (isRecording) {
                await callRecording(classroomId, "stop");
                setIsRecording(false);
                toast.success("Recording stopped — file will appear in class details shortly.");
            } else {
                await callRecording(classroomId, "start");
                setIsRecording(true);
                toast.success("🔴 Recording started");
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Recording error";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={loading}
            title={isRecording ? "Stop Recording" : "Start Recording"}
            className={cn(
                "flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-60",
                isRecording
                    ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                    : "bg-[hsl(var(--room-tile))] text-room-muted hover:bg-[hsl(var(--room-tile-border))]",
            )}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
                <>
                    {/* Pulsing red dot */}
                    <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
                    </span>
                    <StopCircle className="h-4 w-4" />
                </>
            ) : (
                <Circle className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
                {loading ? "…" : isRecording ? "Stop Rec" : "Record"}
            </span>
        </button>
    );
};