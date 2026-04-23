import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: "default" | "danger" | "primary";
  label?: string;
  children: ReactNode;
}

export const ToolbarButton = forwardRef<HTMLButtonElement, Props>(
  ({ active, variant = "default", label, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        title={label}
        aria-label={label}
        className={cn(
          "flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
          variant === "danger" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
          variant === "default" &&
            (active
              ? "bg-[hsl(var(--speaking))]/20 text-[hsl(var(--speaking))] hover:bg-[hsl(var(--speaking))]/30"
              : "bg-[hsl(var(--room-tile))] text-white hover:bg-[hsl(var(--room-tile-border))]"),
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
ToolbarButton.displayName = "ToolbarButton";
