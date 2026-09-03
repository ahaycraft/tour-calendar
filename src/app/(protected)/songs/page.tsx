import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Disc3, MessageSquare, Music } from "lucide-react";
import SongStatusBadge from "@/components/SongStatusBadge";
import { SONG_STATUSES, songStatusLabel, type SongStatus } from "@/lib/songs";

export default async function SongsPage() {
  await auth();

  const songs = await prisma.song.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { comments: true } },
      tracks: {
        include: { release: { select: { id: true, title: true } } },
      },
    },
  });

  const byStatus = new Map<SongStatus, typeof songs>();
  for (const s of songs) {
    const key = s.status as SongStatus;
    if (!byStatus.has(key)) byStatus.set(key, []);
    byStatus.get(key)!.push(s);
  }

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
        <div className="space-y-8">
          {SONG_STATUSES.filter((s) => byStatus.has(s)).map((status) => (
            <section key={status}>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-3">
                {songStatusLabel[status]}
                <span className="ml-2 text-zinc-700">{byStatus.get(status)!.length}</span>
              </h2>
              <div className="space-y-2">
                {byStatus.get(status)!.map((song) => (
                  <Link
                    key={song.id}
                    href={`/songs/${song.id}`}
                    className="flex items-center justify-between gap-4 bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-100">{song.title}</span>
                        <SongStatusBadge status={song.status} />
                        {song.tracks.map((t) => (
                          <span
                            key={t.release.id}
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800 rounded px-1.5 py-0.5"
                          >
                            <Disc3 size={11} />
                            {t.release.title}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {[song.key, song.tempo ? `${song.tempo} BPM` : null, song.timeSig]
                          .filter(Boolean)
                          .join(" · ") || "No details yet"}
                        {" · "}
                        edited {format(song.updatedAt, "MMM d")}
                      </p>
                    </div>
                    {song._count.comments > 0 && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                        <MessageSquare size={13} />
                        {song._count.comments}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
