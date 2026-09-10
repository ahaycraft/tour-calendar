import { ChevronLeft } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-6xl">
      <div className="inline-flex items-center gap-1 text-sm text-zinc-500 mb-6">
        <ChevronLeft size={16} />
        Back to Songs
      </div>

      <div className="animate-pulse space-y-6">
        <SkeletonBlock className="h-8 w-1/2" />
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="grid grid-cols-4 gap-2 max-w-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-9" />
            ))}
          </div>
        </div>
        <SkeletonBlock className="h-48 w-full" />
      </div>
    </div>
  );
}
