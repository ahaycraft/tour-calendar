import { ChevronLeft } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="inline-flex items-center gap-1 text-sm text-zinc-500 mb-6">
        <ChevronLeft size={16} />
        Back
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] items-start">
        <div className="animate-pulse space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <SkeletonBlock className="h-7 w-1/2" />
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-4 w-1/3" />
          <div className="pt-4 space-y-2">
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-4 w-2/5" />
          </div>
        </div>
        <div className="h-64 rounded-2xl bg-zinc-800/60 animate-pulse" />
      </div>
    </div>
  );
}
