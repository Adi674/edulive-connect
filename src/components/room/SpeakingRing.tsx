import { cn } from "@/lib/utils";

export const SpeakingRing = ({ active, className }: { active: boolean; className?: string }) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute inset-0 rounded-xl border-2 border-transparent transition-opacity",
      active ? "speaking-ring opacity-100" : "opacity-0",
      className,
    )}
  />
);
