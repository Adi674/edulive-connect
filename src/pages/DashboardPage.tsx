import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clearSession, getSession, type SessionUser } from "@/lib/auth";

function extractToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // Strip query string / hash
  const cleaned = trimmed.split("?")[0].split("#")[0];
  // If it contains "/", take the last segment
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }
  return cleaned;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setUser(session.user);
  }, [navigate]);

  const onLogout = () => {
    clearSession();
    navigate("/login");
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    const token = extractToken(joinInput);
    if (!token) {
      setJoinError("Please paste a join link or token");
      return;
    }
    setJoinError(null);
    navigate(`/room/${token}`);
  };

  if (!user) return null;

  const isTeacher = user.role === "teacher";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/40">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap className="h-6 w-6 text-primary" />
            EduLive
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm font-medium">{user.name}</span>
              <Badge variant="secondary" className="capitalize">{user.role}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {user.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground">
            Logged in as {user.name} · <span className="capitalize">{user.role}</span>
          </p>
        </div>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Video className="h-5 w-5 text-primary" />
              Join a Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onJoin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="join">Paste your join link or token</Label>
                <Input
                  id="join"
                  value={joinInput}
                  onChange={(e) => {
                    setJoinInput(e.target.value);
                    if (joinError) setJoinError(null);
                  }}
                  placeholder="https://…/room/abc123  or  abc123"
                />
                {joinError && <p className="text-xs text-destructive">{joinError}</p>}
              </div>
              <Button type="submit" className="w-full sm:w-auto">Join Now</Button>
            </form>
          </CardContent>
        </Card>

        {isTeacher && (
          <Card className="rounded-xl border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Quick Start a Class</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                To create a classroom, use the API or Postman for now. Once created and started,
                paste the join token above to enter as teacher.
              </p>
              <p className="text-xs text-muted-foreground">
                Logged in as <span className="font-medium text-foreground">{user.name}</span> ·{" "}
                <span className="capitalize">{user.role}</span>
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
