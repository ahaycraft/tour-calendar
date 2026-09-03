"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { eachDayOfInterval, format, isValid, parseISO } from "date-fns";
import { eventBasePath } from "@/lib/events";
import CalendarExportLink from "@/components/CalendarExportLink";

const inputClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const MAX_EVENTS = 90;

export default function BulkEventForm({
  defaultType = "SHOW",
}: {
  defaultType?: "SHOW" | "RECORDING";
}) {
  const router = useRouter();
  const [eventType, setEventType] = useState<"SHOW" | "RECORDING">(defaultType);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [country, setCountry] = useState("US");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ count: number; ids: string[] } | null>(
    null
  );

  const isRecording = eventType === "RECORDING";

  // Every day in the range; the user unchecks travel / off days.
  const rangeDays = useMemo(() => {
    if (!start || !end) return [];
    const s = parseISO(start);
    const e = parseISO(end);
    if (!isValid(s) || !isValid(e) || e < s) return [];
    const days = eachDayOfInterval({ start: s, end: e });
    return days.length > MAX_EVENTS ? [] : days.map((d) => format(d, "yyyy-MM-dd"));
  }, [start, end]);

  const rangeTooLong =
    start !== "" &&
    end !== "" &&
    rangeDays.length === 0 &&
    parseISO(end) >= parseISO(start);

  const selected = rangeDays.filter((d) => !skipped.has(d));

  function toggleDay(day: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (selected.length === 0) {
      setError("Pick at least one date.");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/shows/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: eventType,
        name,
        dates: selected,
        city: city || undefined,
        state: stateField || undefined,
        country: country || "US",
      }),
    });

    setLoading(false);

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error || "Failed to create events");
      return;
    }

    // Refresh the list route's data in the background, then show the recap
    // (with a one-tap "add every date to your calendar" link).
    router.refresh();
    setCreated({ count: json.count ?? selected.length, ids: json.ids ?? [] });
  }

  if (created) {
    const noun = isRecording ? "session" : "show";
    const listPath = eventBasePath(eventType);
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 px-4 py-3 text-sm text-zinc-300">
          Created{" "}
          <span className="font-medium text-zinc-100">{created.count}</span> {noun}
          {created.count === 1 ? "" : "s"}. Venues are blank — fill them in on each
          event.
        </div>

        {created.ids.length > 0 && (
          <div>
            <CalendarExportLink
              variant="primary"
              label={`Add all ${created.count} to calendar`}
              href={`/api/shows/calendar.ics?ids=${created.ids.join(",")}`}
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              Downloads one .ics — adds every date at once in Apple Calendar, or
              import it into Google Calendar.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Link
            href={listPath}
            className="text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            View {isRecording ? "recordings" : "shows"} →
          </Link>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setName("");
              setStart("");
              setEnd("");
              setSkipped(new Set());
            }}
            className="text-sm font-medium text-zinc-400 hover:text-zinc-200"
          >
            Add another batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-1 p-1 bg-zinc-800/60 rounded-lg">
        {(["SHOW", "RECORDING"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setEventType(t)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              eventType === t
                ? "bg-zinc-700 text-zinc-50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t === "SHOW" ? "Shows" : "Recordings"}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          {isRecording ? "Session block" : "Tour"} name{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder={isRecording ? "e.g. LP2 Tracking" : "e.g. Fall Tour"}
        />
        <p className="mt-1 text-xs text-zinc-600">
          Events are titled &ldquo;{name.trim() || "Fall Tour"} — Day 1&rdquo;,
          &ldquo;Day 2&rdquo;, and so on.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Start date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            End date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            min={start || undefined}
            className={inputClass}
          />
        </div>
      </div>

      {rangeTooLong && (
        <p className="text-sm text-amber-400">
          That range is longer than {MAX_EVENTS} days — narrow it down.
        </p>
      )}

      {rangeDays.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Days <span className="text-zinc-600">— uncheck travel or off days</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {rangeDays.map((day) => {
              const on = !skipped.has(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    on
                      ? "bg-blue-600/20 border-blue-600/40 text-blue-300"
                      : "bg-zinc-800/60 border-zinc-800 text-zinc-600 line-through"
                  }`}
                >
                  {format(parseISO(day), "EEE M/d")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            City <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
            placeholder="Same for every date"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">State</label>
          <input
            value={stateField}
            onChange={(e) => setStateField(e.target.value)}
            className={inputClass}
            placeholder="CA"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Country</label>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 px-3 py-2 text-xs text-zinc-400">
        {selected.length === 0 ? (
          "Pick a date range to see what will be created."
        ) : (
          <>
            Creates <span className="font-medium text-zinc-200">{selected.length}</span>{" "}
            {isRecording ? "recording session" : "show"}
            {selected.length === 1 ? "" : "s"}:{" "}
            {selected
              .slice(0, 8)
              .map((d) => format(parseISO(d), "MMM d"))
              .join(", ")}
            {selected.length > 8 ? `, +${selected.length - 8} more` : ""}. Venues are
            left blank — fill them in on each event afterwards.
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || selected.length === 0}
        className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading
          ? "Creating..."
          : `Create ${selected.length || ""} ${
              isRecording ? "session" : "show"
            }${selected.length === 1 ? "" : "s"}`}
      </button>
    </form>
  );
}
