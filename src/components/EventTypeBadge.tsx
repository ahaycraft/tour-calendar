import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  SHOW: "badge-denim",
  RECORDING: "badge-mauve",
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
