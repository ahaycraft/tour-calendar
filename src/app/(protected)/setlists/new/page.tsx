import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { canAccessContent, requireActiveBandId } from "@/lib/band";
import NewSetlistForm from "@/components/NewSetlistForm";

export default async function NewSetlistPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);
  if (!canAccessContent(session!, bandId)) redirect("/setlists");

  return (
    <div className="max-w-md">
      <Link
        href="/setlists"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Setlists
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-1">New Setlist</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Name it, then add songs on the next screen.
      </p>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <NewSetlistForm bandId={bandId} />
      </div>
    </div>
  );
}
