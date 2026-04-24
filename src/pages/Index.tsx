import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Video, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/40">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <GraduationCap className="h-6 w-6 text-primary" />
            EduLive
          </Link>
          <nav className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
            <span>Courses</span>
            <span>About</span>
            <span>Contact</span>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/register"><Button size="sm">Register</Button></Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Phase 1 — Live Rooms
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Live conferencing for India's classrooms
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Marketplace, dashboards, and auth ship in Phase 2. For now, jump straight into a live room
            to preview the Google Meet–style teacher and student experience.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link to="/room/demo123?role=teacher">
              <Button size="lg" className="w-full">
                <Video className="mr-2 h-5 w-5" />
                Open Teacher Room
              </Button>
            </Link>
            <Link to="/room/demo123?role=student">
              <Button size="lg" variant="secondary" className="w-full">
                <Users className="mr-2 h-5 w-5" />
                Open Student Room
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 text-left">
            <DemoLink to="/room/scheduled" label="Try error: class not started" />
            <DemoLink to="/room/ended" label="Try error: class has ended" />
          </div>
        </section>
      </main>
    </div>
  );
};

const DemoLink = ({ to, label }: { to: string; label: string }) => (
  <Link
    to={to}
    className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
  >
    {label} →
  </Link>
);

export default Index;
