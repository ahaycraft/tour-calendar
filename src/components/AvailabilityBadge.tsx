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

export default function AvailabilityBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", variants[status] ?? "bg-zinc-700 text-zinc-400")}>
      {labels[status] ?? status}
    </span>
  );
}
