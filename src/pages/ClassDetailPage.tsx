/**
 * src/pages/ClassDetailPage.tsx
 *
 * Phase 6 — Class detail page
 *
 * Shows:
 *  - Class title, status, schedule, duration, description
 *  - Teacher controls: Start / End class
 *  - Join button (both roles, only when LIVE)
 *  - Recordings list with playback links
 *  - Student: read-only, no start/end buttons
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Video,
    Clock,
    Calendar,
    PlayCircle,
    Circle,
    CheckCircle2,
    Loader2,
    Film,
    Download,
    ExternalLink,
    AlertCircle,
    Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { getSession, type SessionUser } from "@/lib/auth";

// ── Types ──────────────────────────────────────────────────────────────────
interface RecordingOut {
    id: string;
    classroom_id: string;
    egress_id: string;
    s3_key: string | null;
    status: "recording" | "completed" | "failed";
    started_at: string;
    ended_at: string | null;
}

interface ClassroomDetailOut {
    id: string;
    batch_id: string;
    teacher_id: string;
    title: string;
    description: string | null;
    status: "scheduled" | "live" | "ended";
    scheduled_at: string | null;
    started_at: string | null;
    ended_at: string | null;
    duration_minutes: number;
    join_token: string;
    created_at: string;
    recordings: RecordingOut[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(date: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function dur(start: string | null, end: string | null) {
    if (!start || !end) return null;
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const STATUS_META = {
    scheduled: { label: "Scheduled", cls: "bg-yellow-100 text-yellow-800", icon: Circle },
    live: { label: "Live Now", cls: "bg-green-100 text-green-800 animate-pulse", icon: PlayCircle },
    ended: { label: "Ended", cls: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

// ── Recording Row ─────────────────────────────────────────────────────────────
function RecordingRow({ recording, classroomId }: { recording: RecordingOut; classroomId: string }) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUrl = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<{ url: string; expires_in_seconds: number }>(
                `/classrooms/recordings/${recording.id}/url`
            );
            setUrl(data.url);
            // Auto-open
            window.open(data.url, "_blank", "noopener");
        } catch (e) {
            setError((e as ApiError).message || "Failed to get URL");
        } finally {
            setLoading(false);
        }
    };

    const isCompleted = recording.status === "completed";
    const isActive = recording.status === "recording";

    return (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive ? "bg-destructive/10" : "bg-primary/10"}`}>
                    <Film className={`h-4 w-4 ${isActive ? "text-destructive" : "text-primary"}`} />
                </div>
                <div>
                    <p className="text-sm font-medium">
                        {isActive ? (
                            <span className="flex items-center gap-1.5 text-destructive">
                                <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-destructive" />
                                Recording in progress…
                            </span>
                        ) : (
                            `Recording — ${fmt(recording.started_at)}`
                        )}
                    </p>
                    {recording.ended_at && (
                        <p className="text-xs text-muted-foreground">
                            Duration: {dur(recording.started_at, recording.ended_at)}
                        </p>
                    )}
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
            </div>

            {isCompleted && (
                <div className="flex items-center gap-2">
                    {url ? (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                        </a>
                    ) : (
                        <Button size="sm" variant="outline" onClick={fetchUrl} disabled={loading}>
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            {loading ? "Loading…" : "Play"}
                        </Button>
                    )}
                </div>
            )}
            {recording.status === "failed" && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" /> Failed
                </span>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ClassDetailPage = () => {
    const { classroomId } = useParams<{ classroomId: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<SessionUser | null>(null);
    const [cls, setCls] = useState<ClassroomDetailOut | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<"start" | "end" | null>(null);

    useEffect(() => {
        const session = getSession();
        if (!session) { navigate("/login"); return; }
        setUser(session.user);
        if (classroomId) loadClassroom(classroomId);
    }, [classroomId, navigate]);

    async function loadClassroom(id: string) {
        setLoading(true);
        try {
            const data = await api.get<ClassroomDetailOut>(`/classrooms/${id}/detail`);
            setCls(data);
        } catch {
            navigate(-1);
        } finally {
            setLoading(false);
        }
    }

    const handleStart = async () => {
        if (!cls) return;
        setActionLoading("start");
        try {
            await api.post(`/classrooms/${cls.id}/start`);
            setCls((prev) => prev ? { ...prev, status: "live" } : prev);
        } catch (e) {
            alert((e as ApiError).message || "Failed to start class");
        } finally {
            setActionLoading(null);
        }
    };

    const handleEnd = async () => {
        if (!cls || !confirm("End the class for everyone?")) return;
        setActionLoading("end");
        try {
            await api.post(`/classrooms/${cls.id}/end`);
            setCls((prev) => prev ? { ...prev, status: "ended" } : prev);
        } catch (e) {
            alert((e as ApiError).message || "Failed to end class");
        } finally {
            setActionLoading(null);
        }
    };

    if (!user || loading || !cls) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const isTeacher = user.role === "teacher";
    const meta = STATUS_META[cls.status];
    const StatusIcon = meta.icon;

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <button
                            onClick={() => navigate(`/batches/${cls.batch_id}`)}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>
                        <span className="text-muted-foreground">/ </span>
                        <span className="text-sm font-medium truncate">{cls.title}</span>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        {cls.status === "live" && (
                            <Link
                                to={`/room/${cls.join_token}`}
                                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                <Video className="h-4 w-4" />
                                {isTeacher ? "Enter Room" : "Join Class"}
                            </Link>
                        )}
                        {isTeacher && cls.status === "scheduled" && (
                            <Button size="sm" onClick={handleStart} disabled={actionLoading === "start"}>
                                {actionLoading === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                                Start Class
                            </Button>
                        )}
                        {isTeacher && cls.status === "live" && (
                            <Button size="sm" variant="destructive" onClick={handleEnd} disabled={actionLoading === "end"}>
                                {actionLoading === "end" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                End Class
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto max-w-2xl px-4 py-8 space-y-5">
                {/* Class info card */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold leading-tight">{cls.title}</h1>
                            {cls.description && <p className="mt-1 text-sm text-muted-foreground">{cls.description}</p>}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${meta.cls}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {meta.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Scheduled" value={fmt(cls.scheduled_at)} />
                        <InfoRow icon={<Clock className="h-4 w-4" />} label="Duration" value={`${cls.duration_minutes} minutes`} />
                        {cls.started_at && <InfoRow icon={<PlayCircle className="h-4 w-4" />} label="Started" value={fmt(cls.started_at)} />}
                        {cls.ended_at && <InfoRow icon={<CheckCircle2 className="h-4 w-4" />} label="Ended" value={fmt(cls.ended_at)} />}
                        {cls.started_at && cls.ended_at && (
                            <InfoRow icon={<Clock className="h-4 w-4" />} label="Actual Duration" value={dur(cls.started_at, cls.ended_at) || "—"} />
                        )}
                    </div>
                </div>

                {/* Recordings */}
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Film className="h-4 w-4 text-primary" />
                            Recordings
                        </h2>
                        <span className="text-xs text-muted-foreground">{cls.recordings.length} recording{cls.recordings.length !== 1 ? "s" : ""}</span>
                    </div>

                    {cls.recordings.length === 0 ? (
                        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-10 text-center">
                            <Film className="mb-2 h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">
                                {cls.status === "ended"
                                    ? "No recordings available for this class."
                                    : cls.status === "live"
                                        ? isTeacher
                                            ? "Start a recording from inside the room."
                                            : "No recordings yet."
                                        : "Recordings will appear here after the class."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cls.recordings.map((r) => (
                                <RecordingRow key={r.id} recording={r} classroomId={cls.id} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="mt-0.5 text-muted-foreground">{icon}</span>
            <div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="font-medium">{value}</div>
            </div>
        </div>
    );
}

export default ClassDetailPage;