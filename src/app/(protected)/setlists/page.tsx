import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, requireActiveBandId } from "@/lib/band";
import { ListMusic } from "lucide-react";
import SetlistsList from "@/components/SetlistsList";
import AddButton from "@/components/AddButton";

export default async function SetlistsPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);
  if (!canAccessContent(session!, bandId)) redirect("/calendar");

  const setlists = await prisma.setlist.findMany({
    where: { bandId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { songs: true } } }
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Setlists</h1>
        <AddButton href="/setlists/new" label="New Setlist" />
      </div>

      {setlists.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-10 text-center">
          <ListMusic size={28} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 text-sm">
            No setlists yet. Make a reusable template like &ldquo;Full
            Set&rdquo; or &ldquo;Acoustic Set&rdquo; to apply to shows.
          </p>
        </div>
      ) : (
        <SetlistsList
          initial={setlists.map((s) => ({
            id: s.id,
            name: s.name,
            songCount: s._count.songs
          }))}
        />
      )}
    </div>
  );
}
