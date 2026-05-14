import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = "brand",
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "brand" | "neutral" | "action";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill =
    tone === "brand"
      ? "bg-[var(--green)]"
      : tone === "action"
      ? "bg-[var(--red)]"
      : "bg-[var(--foreground-muted)]";
  return (
    <div
      className={cn(
        "h-2 w-full rounded-full bg-[var(--surface-3)] overflow-hidden",
        className
      )}
    >
      <div
        className={cn(fill, "h-full rounded-full transition-[width]")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
