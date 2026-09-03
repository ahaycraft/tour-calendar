import { redirect } from "next/navigation";
import { startOfDay } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBand, userBands } from "@/lib/band";
import Nav from "@/components/Nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const activeBand = await getActiveBand(session);
  if (!activeBand) redirect("/bands/new");

  // Upcoming, non-cancelled events in the active band that the current user
  // still owes a response on. (Whether an admin has confirmed the show is a
  // separate concern and deliberately not counted here.)
  const needsResponseCount = await prisma.show.count({
    where: {
      bandId: activeBand.id,
      status: { not: "CANCELLED" },
      date: { gte: startOfDay(new Date()) },
      NOT: {
        availability: {
          some: {
            userId: session.user.id,
            status: { in: ["AVAILABLE", "UNAVAILABLE"] },
          },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav
        user={session.user}
        bands={userBands(session)}
        activeBandId={activeBand.id}
        needsResponseCount={needsResponseCount}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
