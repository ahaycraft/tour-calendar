import NewReleaseForm from "@/components/NewReleaseForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewReleasePage() {
  return (
    <div className="max-w-md">
      <Link
        href="/releases"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Releases
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-1">New Release</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Name it and pick a kind — then drag songs in on the next screen.
      </p>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <NewReleaseForm />
      </div>
    </div>
  );
}
