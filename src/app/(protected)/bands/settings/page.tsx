import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBand } from "@/lib/band";
import BandSettings from "@/components/BandSettings";

export default async function BandSettingsPage() {
  const session = await auth();
  const active = await getActiveBand(session!);
  if (!active) redirect("/bands/new");

  const band = await prisma.band.findUnique({
    where: { id: active.id },
    include: {
      memberships: {
        orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!band) redirect("/bands/new");

  return (
    <BandSettings
      bandId={band.id}
      bandName={band.name}
      myRole={active.role}
      myUserId={session!.user.id}
      members={band.memberships.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      }))}
      pendingInvites={band.invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role as "ADMIN" | "MEMBER",
        token: i.token,
        expiresAt: i.expiresAt.toISOString(),
      }))}
    />
  );
}
