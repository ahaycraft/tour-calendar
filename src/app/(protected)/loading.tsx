import { SkeletonBlock } from "@/components/Skeleton";

/** Fallback for protected routes without a more specific loading.tsx
 *  (forms, settings, admin). */
export default function Loading() {
  return (
    <div className="max-w-2xl animate-pulse space-y-6">
      <SkeletonBlock className="h-8 w-1/3" />
      <SkeletonBlock className="h-40 w-full" />
      <SkeletonBlock className="h-40 w-full" />
    </div>
  );
}
