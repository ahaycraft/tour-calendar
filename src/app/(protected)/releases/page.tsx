import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage, requireActiveBandId } from "@/lib/band";
import Link from "next/link";
import { Disc3 } from "lucide-react";
import ReleasesList from "@/components/ReleasesList";

export default async function ReleasesPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);

  const releases = await prisma.release.findMany({
    where: { bandId },
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
        <ReleasesList
          initialReleases={releases.map((r) => ({
            id: r.id,
            title: r.title,
            kind: r.kind,
            status: r.status,
            trackCount: r._count.tracks,
            createdAt: r.createdAt.toISOString(),
            targetDate: r.targetDate ? r.targetDate.toISOString() : null,
            canDelete: canManage(session!, bandId, r.createdById),
          }))}
        />
      )}
    </div>
  );
}
