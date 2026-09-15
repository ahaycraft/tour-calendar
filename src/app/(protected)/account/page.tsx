import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AccountSettings from "@/components/AccountSettings";

export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true }
  });
  if (!user) redirect("/login");

  return (
    <AccountSettings name={user.name} email={user.email} phone={user.phone} />
  );
}
