import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage, requireActiveBandId } from "@/lib/band";
import Link from "next/link";
import { Music } from "lucide-react";
import SongsList from "@/components/SongsList";

export default async function SongsPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);

  const songs = await prisma.song.findMany({
    where: { bandId },
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { comments: true } },
      tracks: {
        include: { release: { select: { id: true, title: true } } },
      },
    },
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Songs</h1>
        <Link
          href="/songs/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors text-sm"
        >
          + New Song
        </Link>
      </div>

      {songs.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-10 text-center">
          <Music size={28} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 text-sm">
            No songs yet. Start one to capture lyrics, a demo link, and feedback.
          </p>
        </div>
      ) : (
        <SongsList
          initialSongs={songs.map((song) => ({
            id: song.id,
            title: song.title,
            status: song.status,
            key: song.key,
            tempo: song.tempo,
            timeSig: song.timeSig,
            updatedAt: song.updatedAt.toISOString(),
            commentCount: song._count.comments,
            canDelete: canManage(session!, bandId, song.createdById),
            tracks: song.tracks.map((t) => ({
              release: { id: t.release.id, title: t.release.title },
            })),
          }))}
        />
      )}
    </div>
  );
}
