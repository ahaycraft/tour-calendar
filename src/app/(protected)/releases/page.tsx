import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  releaseKindLabel,
  releaseStatusClass,
  releaseStatusLabel,
  type ReleaseKind,
  type ReleaseStatus,
} from "@/lib/releases";

export default async function ReleasesPage() {
  await auth();

  const releases = await prisma.release.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { tracks: true } } },
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Releases</h1>
        <Link
          href="/releases/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors text-sm"
        >
          + New Release
        </Link>
      </div>

      {releases.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-10 text-center">
          <Disc3 size={28} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 text-sm">
            No releases yet. Make an album, EP, or group and drag songs into it.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {releases.map((r) => (
            <Link
              key={r.id}
              href={`/releases/${r.id}`}
              className="flex items-center justify-between gap-4 bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-zinc-100">{r.title}</span>
                  <span className="text-xs text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5">
                    {releaseKindLabel[r.kind as ReleaseKind] ?? r.kind}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      releaseStatusClass[r.status as ReleaseStatus] ?? "bg-zinc-700 text-zinc-400"
                    )}
                  >
                    {releaseStatusLabel[r.status as ReleaseStatus] ?? r.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {r._count.tracks} {r._count.tracks === 1 ? "track" : "tracks"}
                  {r.targetDate ? ` · target ${format(r.targetDate, "MMM yyyy")}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
