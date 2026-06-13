import { DomainStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/constants";
import { statusColorClass } from "@/lib/status-colors";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: DomainStatus | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        statusColorClass(status),
        className
      )}
      title={STATUS_LABELS[status] ?? status}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
