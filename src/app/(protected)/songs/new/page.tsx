import NewSongForm from "@/components/NewSongForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewSongPage() {
  return (
    <div className="max-w-md">
      <Link
        href="/songs"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Songs
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-1">New Song</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Just a title to start — add lyrics, key, a demo link, and the rest on the
        next screen.
      </p>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <NewSongForm />
      </div>
    </div>
  );
}
