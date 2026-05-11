/**
 * src/pages/BatchesPage.tsx
 *
 * Phase 6 — Batch management dashboard
 *
 * Teacher view:
 *  - Stat cards: total batches, total students
 *  - "Create Batch" modal
 *  - Grid of batch cards (name, code, student count, created date)
 *  - Click card → /batches/:id
 *
 * Student view:
 *  - Join by batch code input
 *  - Grid of enrolled batch cards
 *  - Click card → /batches/:id
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    GraduationCap,
    Plus,
    Users,
    BookOpen,
    Hash,
    LogOut,
    ArrowRight,
    Loader2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearSession, getSession, type SessionUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface BatchDetailOut {
    id: string;
    teacher_id: string;
    name: string;
    description: string | null;
    batch_code: string;
    created_at: string;
    student_count?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(date: string) {
    return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Create Batch Modal ───────────────────────────────────────────────────────
function CreateBatchModal({ onClose, onCreated }: { onClose: () => void; onCreated: (b: BatchDetailOut) => void }) {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const batch = await api.post<BatchDetailOut>("/batches", { name: name.trim(), description: desc.trim() || null });
            onCreated(batch);
        } catch (e) {
            setError((e as ApiError).message || "Failed to create batch");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Create New Batch</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="bname">Batch Name *</Label>
                        <Input
                            id="bname"
                            placeholder="e.g. JEE Mains 2025 — Batch A"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="bdesc">Description (optional)</Label>
                        <Input
                            id="bdesc"
                            placeholder="Brief description of this batch"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="flex-1" disabled={loading || !name.trim()}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Batch
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Join Batch Modal (student) ───────────────────────────────────────────────
function JoinBatchModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setLoading(true);
        setError(null);
        try {
            await api.post("/batches/join", { batch_code: code.trim().toUpperCase() });
            onJoined();
        } catch (e) {
            const err = e as ApiError;
            if (err.status === 409) setError("You are already enrolled in this batch");
            else if (err.status === 404) setError("Invalid batch code — check with your teacher");
            else setError(err.message || "Failed to join batch");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Join a Batch</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="bcode">Batch Code</Label>
                        <Input
                            id="bcode"
                            placeholder="e.g. A3XK9P2Q"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="font-mono tracking-widest"
                        />
                        <p className="text-xs text-muted-foreground">8-character code from your teacher</p>
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="flex-1" disabled={loading || code.length < 6}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Join Batch
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Batch Card ───────────────────────────────────────────────────────────────
function BatchCard({ batch, isTeacher }: { batch: BatchDetailOut; isTeacher: boolean }) {
    return (
        <Link
            to={`/batches/${batch.id}`}
            className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
                        {batch.name}
                    </h3>
                    {batch.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{batch.description}</p>
                    )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {isTeacher && (
                    <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {batch.student_count ?? 0} students
                    </span>
                )}
                <span className="flex items-center gap-1 font-mono bg-muted px-2 py-0.5 rounded-full">
                    <Hash className="h-3 w-3" />
                    {batch.batch_code}
                </span>
                <span>Created {fmt(batch.created_at)}</span>
            </div>
        </Link>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const BatchesPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<SessionUser | null>(null);
    const [batches, setBatches] = useState<BatchDetailOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);

    useEffect(() => {
        const session = getSession();
        if (!session) { navigate("/login"); return; }
        setUser(session.user);
        fetchBatches(session.user.role);
    }, [navigate]);

    async function fetchBatches(role: string) {
        setLoading(true);
        try {
            const endpoint = role === "teacher" ? "/batches" : "/batches/my";
            const data = await api.get<BatchDetailOut[]>(endpoint);
            setBatches(data);
        } catch {
            /* ignore — empty state shown */
        } finally {
            setLoading(false);
        }
    }

    const isTeacher = user?.role === "teacher";

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            EduLive
                        </Link>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-sm font-medium">Batches</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize hidden sm:inline-flex">{user.role}</Badge>
                        {isTeacher ? (
                            <Button size="sm" onClick={() => setShowCreate(true)}>
                                <Plus className="h-4 w-4" />
                                New Batch
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => setShowJoin(true)}>
                                <Plus className="h-4 w-4" />
                                Join Batch
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { clearSession(); navigate("/login"); }}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto max-w-5xl px-4 py-8">
                {/* Stats row — teacher only */}
                {isTeacher && !loading && (
                    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <StatCard icon={<BookOpen className="h-5 w-5 text-primary" />} label="Total Batches" value={batches.length} />
                        <StatCard
                            icon={<Users className="h-5 w-5 text-primary" />}
                            label="Total Students"
                            value={batches.reduce((s, b) => s + (b.student_count ?? 0), 0)}
                        />
                    </div>
                )}

                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                        {isTeacher ? "Your Batches" : "Enrolled Batches"}
                    </h2>
                    <span className="text-sm text-muted-foreground">{batches.length} total</span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : batches.length === 0 ? (
                    <EmptyState isTeacher={isTeacher} onAction={() => isTeacher ? setShowCreate(true) : setShowJoin(true)} />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {batches.map((b) => (
                            <BatchCard key={b.id} batch={b} isTeacher={isTeacher} />
                        ))}
                    </div>
                )}
            </main>

            {showCreate && (
                <CreateBatchModal
                    onClose={() => setShowCreate(false)}
                    onCreated={(b) => { setBatches((prev) => [b, ...prev]); setShowCreate(false); }}
                />
            )}
            {showJoin && (
                <JoinBatchModal
                    onClose={() => setShowJoin(false)}
                    onJoined={() => { setShowJoin(false); fetchBatches("student"); }}
                />
            )}
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <Card className="rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">{icon}</div>
                <div>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ isTeacher, onAction }: { isTeacher: boolean; onAction: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <h3 className="font-semibold">
                {isTeacher ? "No batches yet" : "Not enrolled in any batches"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
                {isTeacher
                    ? "Create your first batch to start adding students and classes."
                    : "Ask your teacher for a batch code to get started."}
            </p>
            <Button className="mt-5" size="sm" onClick={onAction}>
                <Plus className="h-4 w-4" />
                {isTeacher ? "Create First Batch" : "Join a Batch"}
            </Button>
        </div>
    );
}

export default BatchesPage;