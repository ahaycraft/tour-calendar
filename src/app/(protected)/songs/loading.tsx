import { CardRowsSkeleton, SkeletonAction } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Songs</h1>
        <SkeletonAction />
      </div>

      <CardRowsSkeleton count={5} />
    </div>
  );
}
