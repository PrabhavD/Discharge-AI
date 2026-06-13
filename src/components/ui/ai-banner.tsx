import { cn } from "@/lib/utils";

export function AiBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900",
        className
      )}
    >
      <strong>AI draft</strong> — requires clinician review. This is not a clinical decision.
    </div>
  );
}
