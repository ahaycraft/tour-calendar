"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { X, CalendarPlus, Ban, Trash2 } from "lucide-react";
import VenueSearch, { type VenueResult } from "./VenueSearch";
import { type EventTypeStr } from "@/lib/events";

const TYPE_TABS: { value: EventTypeStr; label: string }[] = [
  { value: "SHOW", label: "Show" },
  { value: "PRACTICE", label: "Practice" },
  { value: "RECORDING", label: "Recording" },
];
const TITLE_NOUN: Record<EventTypeStr, string> = {
  SHOW: "Show",
  PRACTICE: "Practice",
  RECORDING: "Session",
};

interface UnavailableDate {
  id: string;
  date: string;
  note?: string;
  userId: string;
  user: { name: string };
}

interface RosterEntry {
  name: string;
  note?: string;
  isSelf: boolean;
}

interface Show {
  id: string;
  type: EventTypeStr;
  title: string;
  venue: string | null;
  city: string | null;
  state?: string;
  date: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  availability: Array<{ userId: string; status: string; user: { name: string } }>;
}

interface Props {
  date: string; // YYYY-MM-DD
  existingUnavailability: UnavailableDate | null;
  dayRoster: RosterEntry[];
  onClose: () => void;
  onUnavailabilityAdded: (record: UnavailableDate) => void;
  onUnavailabilityRemoved: (date: string) => void;
  onShowAdded: (show: Show) => void;
}

const inputClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const emptyMeta = { address: "", lat: null as number | null, lng: null as number | null };

export default function DayActionModal({
  date,
  existingUnavailability,
  dayRoster,
  onClose,
  onUnavailabilityAdded,
  onUnavailabilityRemoved,
  onShowAdded,
}: Props) {
  const [tab, setTab] = useState<"unavailability" | "event">("unavailability");
  const [eventType, setEventType] = useState<EventTypeStr>("SHOW");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [country, setCountry] = useState("US");
  const [venueMeta, setVenueMeta] = useState(emptyMeta);

  const isRecording = eventType === "RECORDING";
  const isShow = eventType === "SHOW";
  const isPractice = eventType === "PRACTICE";

  function handleVenueSelect(v: VenueResult) {
    setVenue(v.name);
    if (v.city) setCity(v.city);
    if (v.state) setStateField(v.state);
    setCountry(v.country || "US");
    setVenueMeta({ address: v.address, lat: v.lat, lng: v.lng });
  }

  const prettyDate = format(new Date(`${date}T00:00:00`), "EEEE, MMMM d, yyyy");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function blockDate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/unavailability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, note }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Failed to block this date");
      return;
    }
    onUnavailabilityAdded(await res.json());
    onClose();
  }

  async function unblockDate() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/unavailability", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Failed to remove unavailability");
      return;
    }
    onUnavailabilityRemoved(date);
    onClose();
  }

  async function addShow(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const data = Object.fromEntries(new FormData(e.currentTarget));
    const loadInTime = data.loadInTime ? `${date}T${data.loadInTime}:00` : undefined;
    const doorsTime = data.doorsTime ? `${date}T${data.doorsTime}:00` : undefined;
    const setTime = data.setTime ? `${date}T${data.setTime}:00` : undefined;

    const res = await fetch("/api/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: eventType,
        title: data.title,
        venue,
        city,
        state: stateField || undefined,
        country: country || "US",
        date: `${date}T00:00:00`,
        loadInTime: isPractice ? undefined : loadInTime,
        doorsTime: isShow ? doorsTime : undefined,
        setTime: isPractice ? undefined : setTime,
        guarantee: isShow ? data.guarantee || undefined : undefined,
        notes: data.notes || undefined,
        venueAddress: venueMeta.address || undefined,
        venueLat: venueMeta.lat ?? undefined,
        venueLng: venueMeta.lng ?? undefined,
      }),
    });

    setBusy(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Failed to create event");
      return;
    }

    const show = await res.json();
    onShowAdded({ ...show, availability: show.availability ?? [] });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-50">{prettyDate}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add an event or block this date.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 -m-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 p-1.5 m-4 mb-0 bg-zinc-800/60 rounded-xl">
          <button
            onClick={() => setTab("unavailability")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "unavailability"
                ? "bg-zinc-700 text-zinc-50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Ban size={15} />
            Unavailability
          </button>
          <button
            onClick={() => setTab("event")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "event"
                ? "bg-zinc-700 text-zinc-50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CalendarPlus size={15} />
            Add Event
          </button>
        </div>

        <div className="p-4">
          {tab === "unavailability" ? (
            <div className="space-y-4">
              {dayRoster.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1.5">
                    Unavailable this day
                  </p>
                  <ul className="space-y-1">
                    {dayRoster.map((r, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex gap-1.5">
                        <Ban size={14} className="mt-0.5 shrink-0 text-orange-500" />
                        <span>
                          <span className={r.isSelf ? "text-zinc-100 font-medium" : ""}>
                            {r.name}
                          </span>
                          {r.note && <span className="text-zinc-500"> — {r.note}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {existingUnavailability ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  You&apos;re marked unavailable on this date
                  {existingUnavailability.note && (
                    <span className="text-zinc-500">
                      {" "}
                      — &ldquo;{existingUnavailability.note}&rdquo;
                    </span>
                  )}
                  .
                </p>
                <button
                  onClick={unblockDate}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-zinc-800 text-red-400 font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={15} />
                  {busy ? "Removing..." : "Remove unavailability"}
                </button>
              </div>
            ) : (
              <form onSubmit={blockDate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Reason <span className="text-zinc-600">(optional)</span>
                  </label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Out of town"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2 px-4 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-500 disabled:opacity-50 transition-colors"
                >
                  {busy ? "Blocking..." : "Block this date"}
                </button>
              </form>
              )}
            </div>
          ) : (
            <form onSubmit={addShow} className="space-y-3">
              <div className="flex gap-1 p-1 bg-zinc-800/60 rounded-lg">
                {TYPE_TABS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEventType(value)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      eventType === value
                        ? "bg-zinc-700 text-zinc-50"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  {TITLE_NOUN[eventType]} Title{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  className={inputClass}
                  placeholder={
                    isRecording
                      ? "e.g. Album tracking — Day 1"
                      : isPractice
                        ? "e.g. Thursday rehearsal"
                        : "e.g. The Roxy w/ Support Act"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  {isRecording ? "Studio" : isPractice ? "Location" : "Venue"}
                </label>
                <VenueSearch
                  value={venue}
                  onValueChange={(val) => {
                    setVenue(val);
                    setVenueMeta(emptyMeta);
                  }}
                  onSelect={handleVenueSelect}
                  inputClassName={inputClass}
                  placeholder={
                    isRecording
                      ? "Search studios…"
                      : isPractice
                        ? "Search rehearsal spaces…"
                        : "Search venues by name or city…"
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    City
                  </label>
                  <input
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                    placeholder="Los Angeles"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">State</label>
                  <input
                    name="state"
                    value={stateField}
                    onChange={(e) => setStateField(e.target.value)}
                    className={inputClass}
                    placeholder="CA"
                  />
                </div>
              </div>
              {/* Practices stay minimal — no call sheet, no guarantee. */}
              {isRecording && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Call Time
                    </label>
                    <input name="loadInTime" type="time" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Wrap Time
                    </label>
                    <input name="setTime" type="time" className={inputClass} />
                  </div>
                </div>
              )}
              {isShow && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Load In</label>
                    <input name="loadInTime" type="time" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Doors</label>
                    <input name="doorsTime" type="time" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Set</label>
                    <input name="setTime" type="time" className={inputClass} />
                  </div>
                </div>
              )}
              {isShow && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Guarantee ($)
                  </label>
                  <input
                    name="guarantee"
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    placeholder="500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder={
                    isRecording
                      ? "Engineer, gear, song list, etc."
                      : isPractice
                        ? "Rehearsal focus, room booking, etc."
                        : "Parking info, contacts, etc."
                  }
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {busy
                  ? "Adding..."
                  : isRecording
                    ? "Add Recording Session"
                    : isPractice
                      ? "Add Practice"
                      : "Add Show"}
              </button>
            </form>
          )}

          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </div>
      </div>
    </div>
  );
}
