import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import SongWorkspace from "@/components/SongWorkspace";
import SongArrangement from "@/components/SongArrangement";
import SongComments from "@/components/SongComments";
import { canManage, isBandMember } from "@/lib/band";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SongPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
      demos: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true } } },
      },
      tracks: {
        include: { release: { select: { id: true, title: true } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
      sections: { orderBy: { position: "asc" } },
    },
  });

  if (!song || !isBandMember(session!, song.bandId)) notFound();

  const canDelete = canManage(session!, song.bandId, song.createdById);

  return (
    <div className="max-w-6xl">
      <Link
        href="/songs"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Songs
      </Link>

      <SongWorkspace
        canDelete={canDelete}
        currentUserId={session!.user.id}
        demosAdmin={canManage(session!, song.bandId)}
        demos={song.demos.map((d) => ({
          id: d.id,
          label: d.label,
          url: d.url,
          createdAt: d.createdAt.toISOString(),
          createdById: d.createdById,
          createdBy: d.createdBy,
        }))}
        meta={
          <>
            Added by {song.createdBy.name}
            {song.updatedById && song.updatedBy && (
              <>
                {" · Last edited by "}
                {song.updatedBy.name}{" "}
                {formatDistanceToNow(song.updatedAt, { addSuffix: true })}
              </>
            )}
            {song.tracks.length > 0 && (
              <>
                {" · On "}
                {song.tracks.map((t, i) => (
                  <span key={t.release.id}>
                    {i > 0 && ", "}
                    <Link
                      href={`/releases/${t.release.id}`}
                      className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                    >
                      {t.release.title}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </>
        }
        sidebar={
          <SongArrangement
            songId={song.id}
            initialSections={song.sections.map((s) => ({
              id: s.id,
              name: s.name,
              notes: s.notes ?? "",
              lyrics: s.lyrics ?? "",
            }))}
          />
        }
        song={{
          id: song.id,
          title: song.title,
          status: song.status,
          key: song.key ?? "",
          tempo: song.tempo != null ? String(song.tempo) : "",
          timeSig: song.timeSig ?? "",
          lyrics: song.lyrics ?? "",
          notes: song.notes ?? "",
        }}
      />

      {/* Match the fields column above: comments sit in the left grid track,
          not under the arrangement sidebar. */}
      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <SongComments
          songId={song.id}
          currentUserId={session!.user.id}
          isAdmin={canManage(session!, song.bandId)}
          initialComments={song.comments.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            user: c.user,
          }))}
        />
      </div>
    </div>
  );
}
