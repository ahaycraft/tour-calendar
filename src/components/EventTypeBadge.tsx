import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  SHOW: "bg-blue-500/15 text-blue-400",
  RECORDING: "bg-violet-500/15 text-violet-400",
};

const labels: Record<string, string> = {
  SHOW: "Show",
  RECORDING: "Recording",
};

export default function EventTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full",
        variants[type] ?? "bg-zinc-700 text-zinc-400"
      )}
    >
      {labels[type] ?? type}
    </span>
  );
}
