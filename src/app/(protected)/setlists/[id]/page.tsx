import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import SetlistEditor from "@/components/SetlistEditor";

export default async function SetlistPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const setlist = await prisma.setlist.findUnique({
    where: { id },
    include: { songs: { orderBy: { position: "asc" } } }
  });
  if (!setlist || !isBandMember(session!, setlist.bandId)) notFound();

  return (
    <div className="max-w-xl">
      <SetlistEditor
        setlist={{ id: setlist.id, name: setlist.name }}
        initialSongs={setlist.songs.map((s) => ({ id: s.id, title: s.title }))}
        canEdit={canAccessContent(session!, setlist.bandId)}
      />
    </div>
  );
}
