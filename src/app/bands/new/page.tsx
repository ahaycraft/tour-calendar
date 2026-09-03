import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { userBands } from "@/lib/band";
import NewBandForm from "@/components/NewBandForm";

export default async function NewBandPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const hasBands = userBands(session).length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {hasBands && (
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
        )}
        <h1 className="text-2xl font-bold text-zinc-50 mb-1">
          {hasBands ? "New band" : "Create your band"}
        </h1>
        <p className="text-sm text-zinc-500 mb-6">
          {hasBands
            ? "You'll be switched to it once it's created."
            : "You're not in a band yet — name one to get started."}
        </p>
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <NewBandForm />
        </div>
      </div>
    </div>
  );
}
