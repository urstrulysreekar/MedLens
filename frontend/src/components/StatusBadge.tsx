import type { RangeStatus } from "../types/clinical";
import { cn } from "../lib/utils";

const STATUS_STYLES: Record<RangeStatus, string> = {
  low: "bg-blue-100 text-blue-700 ring-blue-200",
  normal: "bg-slate-100 text-slate-600 ring-slate-200",
  high: "bg-red-100 text-red-700 ring-red-200",
  unknown: "bg-gray-100 text-gray-500 ring-gray-200",
};

const STATUS_DOT: Record<RangeStatus, string> = {
  low: "bg-blue-500",
  normal: "bg-slate-400",
  high: "bg-red-500",
  unknown: "bg-gray-400",
};

/** Color-coded range status badge (blue/slate/red/gray per spec). */
export default function StatusBadge({
  status,
  className,
}: {
  status: RangeStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])}
        aria-hidden
      />
      {status.toUpperCase()}
    </span>
  );
}