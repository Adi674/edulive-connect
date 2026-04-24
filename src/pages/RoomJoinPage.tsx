import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { Loader2 } from "lucide-react";
import { joinClassroom, LIVEKIT_URL, ApiError, isMockMode } from "@/lib/api";
import { ensureMockSession, getRole, getSession } from "@/lib/auth";
import { StudentRoom } from "@/components/room/StudentRoom";
import { TeacherRoom } from "@/components/room/TeacherRoom";
import { Button } from "@/components/ui/button";

interface JoinState {
  status: "loading" | "ready" | "error";
  message?: string;
  errorTitle?: string;
  data?: {
    token: string;
    classroom_id: string;
    classroom_title: string;
    can_publish: boolean; // Added this
  };
}

const RoomJoinPage = () => {
  const { joinToken = "" } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<JoinState>({ status: "loading" });

  useEffect(() => {
    // Auth guard: real backend requires a session
    if (!isMockMode && !getSession()) {
      navigate(`/login?redirect=/room/${joinToken}`);
      return;
    }

    // Phase 1 dev convenience: ensure a session exists in mock mode
    if (isMockMode && !getRole()) {
      const role = new URLSearchParams(window.location.search).get("role") === "teacher"
        ? "teacher" : "student";
      ensureMockSession(role);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await joinClassroom(joinToken);
        if (cancelled) return;
        setState({
          status: "ready",
          data: {
            token: res.token,
            classroom_id: res.classroom_id,
            classroom_title: res.classroom_title,
            can_publish: res.can_publish, // Added this
          },
        });
      } catch (e) {
        if (cancelled) return;
        const err = e as ApiError;
        const msg = err.message || "Could not join class";
        const isEnded = /ended/i.test(msg);
        setState({
          status: "error",
          errorTitle: isEnded ? "This class has ended" : "Class has not started yet",
          message: msg,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [joinToken]);

  const role = getRole();

  if (state.status === "loading") {
    return (
      <div className="room-dark flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-room-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Joining class…
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="room-dark flex min-h-screen items-center justify-center p-6">
        <div className="room-tile max-w-md rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-white">{state.errorTitle}</h2>
          <p className="mt-2 text-sm text-room-muted">{state.message}</p>
          <Button className="mt-6" onClick={() => navigate("/")}>Back to home</Button>
        </div>
      </div>
    );
  }

  const { token, classroom_id, classroom_title } = state.data!;
  const isTeacher = role === "teacher";

  // If LiveKit URL or token is missing (mock mode / no LK server), render a demo
  // shell so the UI is still inspectable.
  if (!LIVEKIT_URL || !token) {
    return (
      <div className="room-dark flex min-h-screen flex-col">
        <DemoBanner />
        {isTeacher
          ? <DemoRoomShell title={classroom_title} classroomId={classroom_id} variant="teacher" />
          : <DemoRoomShell title={classroom_title} classroomId={classroom_id} variant="student" />}
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      {isTeacher
        ? <TeacherRoom classroomId={classroom_id} title={classroom_title} />
        : <StudentRoom classroomId={classroom_id} title={classroom_title} />}
    </LiveKitRoom>
  );
};

const DemoBanner = () => (
  <div className="bg-primary/15 px-4 py-2 text-center text-xs text-primary">
    Demo mode — set <code className="font-mono">VITE_API_URL</code> &amp;{" "}
    <code className="font-mono">VITE_LIVEKIT_URL</code> to connect to your FastAPI + LiveKit backend.
  </div>
);

import { RoomTopBar } from "@/components/room/RoomTopBar";
import { ToolbarButton } from "@/components/room/ToolbarButton";
import { Camera, MessageSquare, Mic, MonitorUp, PhoneOff } from "lucide-react";

const DemoRoomShell = ({
  title,
  variant,
}: {
  title: string;
  classroomId: string;
  variant: "student" | "teacher";
}) => {
  const navigate = useNavigate();
  const fakeNames = ["Aarav S.", "Neha P.", "Rohan K.", "Ishita M.", "Vikram R.", "Sara T."];
  return (
    <div className="flex flex-1 flex-col">
      <header className="room-toolbar flex items-center justify-between border-b border-[hsl(var(--room-tile-border))] px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-white">{title}</h1>
          {variant === "teacher" && (
            <span className="live-badge flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> LIVE
            </span>
          )}
        </div>
        <Button variant="destructive" size="sm" onClick={() => navigate("/")}>
          {variant === "teacher" ? "End Class" : "Leave"}
        </Button>
      </header>
      <main className="flex-1 overflow-auto p-4">
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {fakeNames.map((n, i) => (
            <div key={n} className="room-tile relative flex aspect-video items-center justify-center overflow-hidden rounded-xl">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-2xl font-semibold text-primary">
                {n.split(" ").map((s) => s[0]).join("")}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-sm text-white">
                {n} {i === 0 && variant === "teacher" && (
                  <span className="ml-1 rounded bg-primary/80 px-1.5 py-0.5 text-[10px] uppercase">You</span>
                )}
              </div>
              {i === 1 && <div className="speaking-ring pointer-events-none absolute inset-0 rounded-xl border-2" />}
            </div>
          ))}
        </div>
      </main>
      <footer className="room-toolbar flex flex-wrap items-center justify-center gap-3 border-t border-[hsl(var(--room-tile-border))] px-4 py-3">
        <ToolbarButton active label="Mic"><Mic className="h-5 w-5" /></ToolbarButton>
        {variant === "teacher" && (
          <>
            <ToolbarButton active label="Camera"><Camera className="h-5 w-5" /></ToolbarButton>
            <ToolbarButton label="Share"><MonitorUp className="h-5 w-5" /></ToolbarButton>
          </>
        )}
        <ToolbarButton label="Chat"><MessageSquare className="h-5 w-5" /></ToolbarButton>
        <ToolbarButton variant="danger" label="Leave" onClick={() => navigate("/")}>
          <PhoneOff className="h-5 w-5" />
        </ToolbarButton>
      </footer>
    </div>
  );
};

export default RoomJoinPage;
