import EventForm from "@/components/EventForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewRecordingPage() {
  return (
    <div className="max-w-xl">
      <Link
        href="/recordings"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Recordings
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Add Recording Session</h1>

      <p className="text-sm text-zinc-500 -mt-4 mb-6">
        Booking a block of sessions? 
        <Link href="/recordings/bulk" className="text-blue-400 hover:text-blue-300">
          Add a date range instead →
        </Link>
      </p>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <EventForm defaultType="RECORDING" />
      </div>
    </div>
  );
}
