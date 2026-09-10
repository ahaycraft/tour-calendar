import { ChevronLeft } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl">
      <div className="inline-flex items-center gap-1 text-sm text-zinc-500 mb-6">
        <ChevronLeft size={16} />
        Back to Releases
      </div>

      <div className="animate-pulse space-y-6">
        <SkeletonBlock className="h-8 w-1/2" />
        <div className="flex gap-2.5">
          <SkeletonBlock className="h-8 w-24 rounded-md" />
          <SkeletonBlock className="h-8 w-24 rounded-md" />
          <SkeletonBlock className="h-8 w-32 rounded-md" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 rounded-2xl border border-zinc-800 bg-zinc-900" />
          <div className="h-64 rounded-2xl border border-zinc-800 bg-zinc-900" />
        </div>
      </div>
    </div>
  );
}
