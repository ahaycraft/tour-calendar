import AddShowForm from "@/components/AddShowForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewShowPage() {
  return (
    <div className="max-w-xl">
      <Link
        href="/shows"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Shows
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Add Show</h1>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <AddShowForm />
      </div>
    </div>
  );
}
