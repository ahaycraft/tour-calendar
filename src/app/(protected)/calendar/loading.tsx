export default function Loading() {
  return (
    <div>
      {/* Matches CalendarView's desktop-only page header (hidden on mobile). */}
      <div className="hidden sm:flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Calendar</h1>
        <div className="h-9 w-28 rounded-lg bg-zinc-800 animate-pulse" />
      </div>

      <div className="bg-zinc-900 border-y border-zinc-800 py-4 px-4 -mx-4 sm:mx-0 sm:rounded-2xl sm:border-x sm:p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-zinc-800" />
          <div className="flex gap-2">
            <div className="h-8 w-16 rounded-full bg-zinc-800" />
            <div className="ml-auto h-8 w-32 rounded-lg bg-zinc-800" />
          </div>
          <div className="h-[22rem] rounded-lg bg-zinc-800/60" />
        </div>
      </div>
    </div>
  );
}
