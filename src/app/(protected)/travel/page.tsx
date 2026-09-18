import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import TravelSettings from "@/components/TravelSettings";

const ACCOUNT_SELECT = {
  id: true,
  type: true,
  program: true,
  memberNumber: true
} as const;

export default async function TravelPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const bandId = await getActiveBandId(session);

  const [myAccounts, members] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: ACCOUNT_SELECT
    }),
    bandId
      ? prisma.user.findMany({
          where: { bandMemberships: { some: { bandId } } },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            loyaltyAccounts: { orderBy: { createdAt: "asc" }, select: ACCOUNT_SELECT }
          }
        })
      : Promise.resolve([])
  ]);

  return (
    <TravelSettings
      myAccounts={myAccounts}
      bandmates={members
        .filter((m) => m.id !== session.user.id)
        .map((m) => ({ userId: m.id, name: m.name, accounts: m.loyaltyAccounts }))}
    />
  );
}
