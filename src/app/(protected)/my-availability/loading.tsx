import { CardRowsSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-50 mb-2">My Availability</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Manage days you can&apos;t play and your response to upcoming shows.
      </p>

      <CardRowsSkeleton count={4} />
    </div>
  );
}
