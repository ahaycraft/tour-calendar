import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import ReleaseEditor from "@/components/ReleaseEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReleasePage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const [release, songs] = await Promise.all([
    prisma.release.findUnique({
      where: { id },
      include: {
        tracks: { orderBy: { position: "asc" }, select: { songId: true } },
      },
    }),
    prisma.song.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true },
    }),
  ]);

  if (!release) notFound();

  const canDelete =
    session!.user.role === "ADMIN" || release.createdById === session!.user.id;

  return (
    <div className="max-w-4xl">
      <Link
        href="/releases"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Releases
      </Link>

      <ReleaseEditor
        canDelete={canDelete}
        songs={songs}
        initialTrackIds={release.tracks.map((t) => t.songId)}
        release={{
          id: release.id,
          title: release.title,
          kind: release.kind,
          status: release.status,
          targetDate: release.targetDate
            ? format(release.targetDate, "yyyy-MM-dd")
            : "",
          notes: release.notes ?? "",
        }}
      />
    </div>
  );
}
