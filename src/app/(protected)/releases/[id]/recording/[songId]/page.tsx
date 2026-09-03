import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import SongTrackingDetail from "@/components/SongTrackingDetail";
import { isBandMember } from "@/lib/band";
import { ensureBandInstruments } from "@/lib/instruments";

interface PageProps {
  params: Promise<{ id: string; songId: string }>;
}

export default async function SongTrackingPage({ params }: PageProps) {
  const { id, songId } = await params;
  const session = await auth();

  const release = await prisma.release.findUnique({
    where: { id },
    select: {
      id: true,
      bandId: true,
      tracks: {
        orderBy: { position: "asc" },
        select: { song: { select: { id: true, title: true, status: true } } },
      },
      trackingPlan: { select: { id: true } },
    },
  });

  if (!release || !isBandMember(session!, release.bandId)) notFound();

  const songs = release.tracks.map((t) => t.song);
  const index = songs.findIndex((s) => s.id === songId);
  if (index === -1) notFound();

  // No plan yet — nothing to manage per song; send them to the overview to
  // start one.
  if (!release.trackingPlan) redirect(`/releases/${id}/recording`);

  await ensureBandInstruments(release.bandId);

  const [parts, instruments, memberships] = await Promise.all([
    prisma.recordingPart.findMany({
      where: { planId: release.trackingPlan.id, songId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        songId: true,
        label: true,
        description: true,
        status: true,
        instrument: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    }),
    prisma.instrument.findMany({
      where: { bandId: release.bandId, archived: false },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.bandMembership.findMany({
      where: { bandId: release.bandId },
      orderBy: { user: { name: "asc" } },
      select: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const song = songs[index];
  const prevSong = index > 0 ? songs[index - 1] : null;
  const nextSong = index < songs.length - 1 ? songs[index + 1] : null;

  return (
    <div className="max-w-3xl">
      <SongTrackingDetail
        releaseId={release.id}
        song={song}
        instruments={instruments}
        members={memberships.map((m) => m.user)}
        prevSong={prevSong ? { id: prevSong.id, title: prevSong.title } : null}
        nextSong={nextSong ? { id: nextSong.id, title: nextSong.title } : null}
        initialParts={parts.map((p) => ({
          id: p.id,
          songId: p.songId,
          label: p.label,
          description: p.description ?? "",
          status: p.status,
          instrument: p.instrument,
          assignee: p.assignee,
        }))}
      />
    </div>
  );
}
