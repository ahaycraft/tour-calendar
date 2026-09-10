import { CardRowsSkeleton, SkeletonAction } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Practices</h1>
        <SkeletonAction />
      </div>

      <div className="lg:hidden h-11 mb-6 rounded-xl bg-zinc-800/60 animate-pulse" />

      <h2 className="text-lg font-semibold text-zinc-400 mb-3">Upcoming</h2>
      <CardRowsSkeleton count={4} />
    </div>
  );
}
