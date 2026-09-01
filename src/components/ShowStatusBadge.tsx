import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  PENDING: "bg-blue-500/15 text-blue-400",
  CONFIRMED: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

const labels: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export default function ShowStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", variants[status] ?? "bg-zinc-700 text-zinc-400")}>
      {labels[status] ?? status}
    </span>
  );
}
