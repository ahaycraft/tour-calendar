import { redirect } from "next/navigation";
import { startOfDay } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Nav from "@/components/Nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // Upcoming, non-cancelled events that still need attention: either not yet
  // confirmed, or the current user hasn't recorded their own availability.
  const needsResponseCount = await prisma.show.count({
    where: {
      status: { not: "CANCELLED" },
      date: { gte: startOfDay(new Date()) },
      OR: [
        { status: "PENDING" },
        {
          NOT: {
            availability: {
              some: {
                userId: session.user.id,
                status: { in: ["AVAILABLE", "UNAVAILABLE"] },
              },
            },
          },
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav user={session.user} needsResponseCount={needsResponseCount} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
