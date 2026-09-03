import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import TrackingPlan from "@/components/TrackingPlan";
import { isBandMember } from "@/lib/band";
import { ensureBandInstruments } from "@/lib/instruments";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecordingPlanPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const release = await prisma.release.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      bandId: true,
      tracks: {
        orderBy: { position: "asc" },
        select: { song: { select: { id: true, title: true, status: true } } },
      },
      trackingPlan: {
        select: {
          id: true,
          notes: true,
          parts: { select: { songId: true, status: true } },
        },
      },
    },
  });

  if (!release || !isBandMember(session!, release.bandId)) notFound();

  await ensureBandInstruments(release.bandId);

  const instruments = await prisma.instrument.findMany({
    where: { bandId: release.bandId, archived: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-4xl">
      <Link
        href={`/releases/${release.id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to {release.title}
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-1">Tracking plan</h1>
      <p className="text-sm text-zinc-500 mb-6">{release.title}</p>

      <TrackingPlan
        releaseId={release.id}
        planId={release.trackingPlan?.id ?? null}
        initialNotes={release.trackingPlan?.notes ?? ""}
        songs={release.tracks.map((t) => t.song)}
        instruments={instruments}
        partSummary={release.trackingPlan?.parts ?? []}
      />
    </div>
  );
}
