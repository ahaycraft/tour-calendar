import BulkEventForm from "@/components/BulkEventForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function BulkRecordingsPage() {
  return (
    <div className="max-w-xl">
      <Link
        href="/recordings"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Recordings
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-1">Add a date range</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Block out a run of dates now, then fill in studios on each session.
      </p>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <BulkEventForm defaultType="RECORDING" />
      </div>
    </div>
  );
}
