/**
 * Building blocks for the route-level `loading.tsx` skeletons. These render
 * instantly on navigation (before the server component resolves) so a
 * bottom-nav tap shows page-shaped placeholders instead of a frozen screen.
 */

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-zinc-800 ${className}`} />;
}

/** Stand-in for a page header's add/export button (icon circle on mobile,
 *  pill on sm+ — mirrors AddButton). */
export function SkeletonAction() {
  return (
    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-800 sm:h-9 sm:w-28 sm:rounded-lg" />
  );
}

/** A vertical stack of card-shaped rows, matching the list pages' layout. */
export function CardRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-2.5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <SkeletonBlock className="h-4 w-2/5" />
          <SkeletonBlock className="h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}
