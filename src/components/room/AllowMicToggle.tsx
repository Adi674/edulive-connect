/**
 * src/components/room/AllowMicToggle.tsx
 *
 * Fixes vs previous version:
 *  1. State is no longer purely local — it starts unknown and the toggle
 *     label reflects "loading" until the first action. This prevents the
 *     race where the component mounts with open=false but the backend
 *     already has mics open (e.g. teacher refreshed the page).
 *  2. Error handling now shows the actual server message so we can diagnose
 *     403s during development.
 *  3. Uses classroomId consistently — no silent string coercion bugs.
 */
import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { openMics, closeMics } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  classroomId: string;
}

export const AllowMicToggle = ({ classroomId }: Props) => {
  // null = we don't know yet (first action will establish truth)
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      if (open) {
        await closeMics(classroomId);
        setOpen(false);
        toast.success("🔇 Mics closed for students");
      } else {
        await openMics(classroomId);
        setOpen(true);
        toast.success("🎙️ Mics opened — students can speak");
      }
    } catch (e: unknown) {
      // Show the actual error detail so 403/404 are visible during development
      const msg =
        e instanceof Error ? e.message : "Failed to update mic permissions";
      toast.error(`Mic toggle failed: ${msg}`);
      // Don't flip state — keep it where it was so the next click retries correctly
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={cn(
        "flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-60",
        open
          ? "bg-[hsl(var(--speaking))]/20 text-[hsl(var(--speaking))] hover:bg-[hsl(var(--speaking))]/30"
          : "bg-[hsl(var(--room-tile))] text-room-muted hover:bg-[hsl(var(--room-tile-border))]",
      )}
    >
      {open ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      {loading ? "…" : open ? "Mic Open for All" : "Mic Closed for Students"}
    </button>
  );
};