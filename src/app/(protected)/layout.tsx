import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveBand, userBands } from "@/lib/band";
import { needsResponseCount as getNeedsResponseCount } from "@/lib/events";
import Nav from "@/components/Nav";
import BottomNav from "@/components/BottomNav";

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const activeBand = await getActiveBand(session);
  if (!activeBand) redirect("/bands/new");

  const theme =
    (await cookies()).get("theme")?.value === "light" ? "light" : "dark";

  const needsResponseCount = await getNeedsResponseCount(
    activeBand.id,
    session.user.id
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav
        user={session.user}
        bands={userBands(session)}
        activeBandId={activeBand.id}
        needsResponseCount={needsResponseCount}
        theme={theme}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-8">
        {children}
      </main>
      <BottomNav needsResponseCount={needsResponseCount} />
    </div>
  );
}
