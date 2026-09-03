import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  PENDING: "badge-denim",
  CONFIRMED: "badge-moss",
  CANCELLED: "badge-brick",
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
