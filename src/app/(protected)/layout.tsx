import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Nav from "@/components/Nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav user={session.user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
