import { cn } from "@/lib/utils";
import { songStatusClass, songStatusLabel, type SongStatus } from "@/lib/songs";

export default function SongStatusBadge({ status }: { status: string }) {
  const s = status as SongStatus;
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full",
        songStatusClass[s] ?? "bg-zinc-700 text-zinc-400"
      )}
    >
      {songStatusLabel[s] ?? status}
    </span>
  );
}
