import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  AVAILABLE: "badge-moss",
  UNAVAILABLE: "badge-brick",
  PENDING: "bg-zinc-700 text-zinc-400",
};

const labels: Record<string, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  PENDING: "No response",
};

export default function AvailabilityBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded-full",
        variants[status] ?? "bg-zinc-700 text-zinc-400",
        className
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
