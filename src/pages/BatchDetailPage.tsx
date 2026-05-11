/**
 * src/pages/BatchDetailPage.tsx
 *
 * Phase 6 — Batch detail: lists classrooms inside a batch.
 *
 * Teacher view:
 *  - Batch name, code, student count
 *  - "Create Class" button → modal
 *  - Table/grid of classes: title, status badge, scheduled_at, duration
 *  - Click row → /classes/:id
 *
 * Student view:
 *  - Same list, no Create button
 *  - Status badges for scheduled / live / ended
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    GraduationCap,
    Plus,
    ArrowLeft,
    Video,
    Clock,
    Calendar,
    Users,
    Hash,
    Loader2,
    X,
    Circle,
    PlayCircle,
    CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, ApiError, isMockMode } from "@/lib/api";
import { getSession, type SessionUser } from "@/lib/auth";

// ── Types ──────────────────────────────────────────────────────────────────
interface BatchDetailOut {
    id: string;
    name: string;
    description: string | null;
    batch_code: string;
    created_at: string;
    student_count?: number;
}

interface ClassroomOut {
    id: string;
    batch_id: string;
    title: string;
    description: string | null;
    status: "scheduled" | "live" | "ended";
    scheduled_at: string | null;
    started_at: string | null;
    ended_at: string | null;
    duration_minutes: number;
    join_token: string;
    created_at: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(date: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

const STATUS_META = {
    scheduled: { label: "Scheduled", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Circle },
    live: { label: "Live", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: PlayCircle },
    ended: { label: "Ended", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

// ── Create Classroom Modal ───────────────────────────────────────────────────
function CreateClassModal({ batchId, onClose, onCreated }: {
    batchId: string;
    onClose: () => void;
    onCreated: (c: ClassroomOut) => void;
}) {
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [duration, setDuration] = useState("60");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);
        setError(null);
        try {
            // FastAPI classroom create uses query params
            const token = sessionStorage.getItem("edulive_token");
            const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
            if (!API_URL) throw new Error("No API URL configured");

            const qs = new URLSearchParams({ title: title.trim(), batch_id: batchId });
            if (desc.trim()) qs.set("description", desc.trim());
            if (scheduledAt) qs.set("scheduled_at", new Date(scheduledAt).toISOString());
            qs.set("duration_minutes", duration || "60");

            const res = await fetch(`${API_URL}/classrooms?${qs}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.detail || "Failed to create class");
            onCreated(data as ClassroomOut);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Create New Class</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Title *</Label>
                        <Input placeholder="e.g. Chapter 5 — Quadratic Equations" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Input placeholder="Optional brief description" value={desc} onChange={(e) => setDesc(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Scheduled At</Label>
                            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Duration (min)</Label>
                            <Input type="number" min={15} max={480} value={duration} onChange={(e) => setDuration(e.target.value)} />
                        </div>
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="flex-1" disabled={loading || !title.trim()}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Class
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Class Row ─────────────────────────────────────────────────────────────────
function ClassRow({ cls, isTeacher }: { cls: ClassroomOut; isTeacher: boolean }) {
    const meta = STATUS_META[cls.status];
    const Icon = meta.icon;

    return (
        <Link
            to={`/classes/${cls.id}`}
            className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 transition-all hover:border-primary/40 hover:shadow-sm"
        >
            <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Video className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {cls.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {cls.scheduled_at && (
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {fmt(cls.scheduled_at)}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {cls.duration_minutes} min
                        </span>
                    </div>
                </div>
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                </span>
                {/* Live join shortcut for teacher */}
                {isTeacher && cls.status === "live" && (
                    <Link
                        to={`/room/${cls.join_token}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Enter
                    </Link>
                )}
            </div>
        </Link>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const BatchDetailPage = () => {
    const { batchId } = useParams<{ batchId: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<SessionUser | null>(null);
    const [batch, setBatch] = useState<BatchDetailOut | null>(null);
    const [classes, setClasses] = useState<ClassroomOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        const session = getSession();
        if (!session) { navigate("/login"); return; }
        setUser(session.user);
        if (batchId) loadData(batchId, session.user.role);
    }, [batchId, navigate]);

    async function loadData(id: string, role: string) {
        setLoading(true);
        try {
            const [batchData, classData] = await Promise.all([
                api.get<BatchDetailOut>(`/batches/${id}`),
                api.get<ClassroomOut[]>(`/classrooms/batch/${id}`),
            ]);
            setBatch(batchData);
            setClasses(classData);
        } catch {
            navigate("/batches");
        } finally {
            setLoading(false);
        }
    }

    const isTeacher = user?.role === "teacher";
    const liveCount = classes.filter((c) => c.status === "live").length;
    const endedCount = classes.filter((c) => c.status === "ended").length;
    const scheduledCount = classes.filter((c) => c.status === "scheduled").length;

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <Link to="/batches" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Batches
                        </Link>
                        {batch && (
                            <>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-sm font-medium truncate max-w-[200px]">{batch.name}</span>
                            </>
                        )}
                    </div>
                    {isTeacher && (
                        <Button size="sm" onClick={() => setShowCreate(true)}>
                            <Plus className="h-4 w-4" />
                            New Class
                        </Button>
                    )}
                </div>
            </header>

            <main className="container mx-auto max-w-3xl px-4 py-8">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : batch ? (
                    <>
                        {/* Batch info card */}
                        <div className="mb-6 rounded-2xl border border-border bg-card p-5">
                            <h1 className="text-2xl font-bold">{batch.name}</h1>
                            {batch.description && <p className="mt-1 text-sm text-muted-foreground">{batch.description}</p>}
                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {isTeacher && (
                                    <span className="flex items-center gap-1.5">
                                        <Users className="h-4 w-4" />
                                        {batch.student_count ?? 0} students enrolled
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5 font-mono bg-muted px-2.5 py-0.5 rounded-full text-xs">
                                    <Hash className="h-3 w-3" />
                                    {batch.batch_code}
                                </span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="mb-5 grid grid-cols-3 gap-3">
                            {[
                                { label: "Scheduled", count: scheduledCount, color: "text-yellow-600" },
                                { label: "Live Now", count: liveCount, color: "text-green-600" },
                                { label: "Ended", count: endedCount, color: "text-muted-foreground" },
                            ].map((s) => (
                                <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
                                    <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                                    <div className="text-xs text-muted-foreground">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Class list */}
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-semibold">Classes</h2>
                            <span className="text-sm text-muted-foreground">{classes.length} total</span>
                        </div>

                        {classes.length === 0 ? (
                            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
                                <Video className="mb-3 h-10 w-10 text-muted-foreground/40" />
                                <p className="font-medium">{isTeacher ? "No classes yet" : "No classes scheduled"}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {isTeacher ? "Create your first class for this batch." : "Check back later."}
                                </p>
                                {isTeacher && (
                                    <Button className="mt-4" size="sm" onClick={() => setShowCreate(true)}>
                                        <Plus className="h-4 w-4" /> Create First Class
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {classes.map((c) => <ClassRow key={c.id} cls={c} isTeacher={isTeacher} />)}
                            </div>
                        )}
                    </>
                ) : null}
            </main>

            {showCreate && batchId && (
                <CreateClassModal
                    batchId={batchId}
                    onClose={() => setShowCreate(false)}
                    onCreated={(c) => { setClasses((prev) => [c, ...prev]); setShowCreate(false); }}
                />
            )}
        </div>
    );
};

export default BatchDetailPage;