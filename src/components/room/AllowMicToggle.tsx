import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { openMics, closeMics } from "@/lib/api";
import { cn } from "@/lib/utils";

export const AllowMicToggle = ({ classroomId }: { classroomId: string }) => {
  const [open, setOpen] = useState(false);
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
        toast.success("🎙️ Mics opened — students can rejoin to speak");
      }
    } catch (e) {
      toast.error("Failed to update mic permissions");
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
        "flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
        open
          ? "bg-[hsl(var(--speaking))]/20 text-[hsl(var(--speaking))] hover:bg-[hsl(var(--speaking))]/30"
          : "bg-[hsl(var(--room-tile))] text-room-muted hover:bg-[hsl(var(--room-tile-border))]",
      )}
    >
      {open ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      {open ? "Mic Open for All" : "Mic Closed for Students"}
    </button>
  );
};
