"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VenueSearch, { type VenueResult } from "./VenueSearch";
import ConfirmDialog from "./ConfirmDialog";
import { eventHref } from "@/lib/events";
import { AlertTriangle } from "lucide-react";

const inputClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const emptyMeta = { address: "", lat: null as number | null, lng: null as number | null };

/** Plain-string shape so the server page can hand values to this client form. */
export interface EventFormValues {
  id: string;
  type: "SHOW" | "RECORDING";
  title: string;
  venue: string;
  city: string;
  state: string;
  country: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm */
  loadInTime: string;
  doorsTime: string;
  setTime: string;
  guarantee: string;
  notes: string;
  venueAddress: string;
  venueLat: number | null;
  venueLng: number | null;
  /** Release this session is tracking for; "" when none. Recordings only. */
  releaseId: string;
}

interface Props {
  defaultType?: "SHOW" | "RECORDING";
  /** Present when editing an existing event. */
  event?: EventFormValues;
  /** The band's releases, offered as a link target for recording sessions. */
  releases?: { id: string; title: string }[];
}

export default function EventForm({ defaultType = "SHOW", event, releases = [] }: Props) {
  const router = useRouter();
  const isEdit = event != null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDateChange, setConfirmingDateChange] = useState(false);

  const [eventType, setEventType] = useState<"SHOW" | "RECORDING">(
    event?.type ?? defaultType
  );
  const [date, setDate] = useState(event?.date ?? "");
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [city, setCity] = useState(event?.city ?? "");
  const [stateField, setStateField] = useState(event?.state ?? "");
  const [country, setCountry] = useState(event?.country ?? "US");
  const [releaseId, setReleaseId] = useState(event?.releaseId ?? "");
  const [venueMeta, setVenueMeta] = useState(
    event
      ? { address: event.venueAddress, lat: event.venueLat, lng: event.venueLng }
      : emptyMeta
  );

  const isRecording = eventType === "RECORDING";
  const dateChanged = isEdit && date !== event.date;

  function handleVenueSelect(v: VenueResult) {
    setVenue(v.name);
    if (v.city) setCity(v.city);
    if (v.state) setStateField(v.state);
    setCountry(v.country || "US");
    setVenueMeta({ address: v.address, lat: v.lat, lng: v.lng });
  }

  async function save(form: HTMLFormElement) {
    setError("");
    setLoading(true);

    const data = Object.fromEntries(new FormData(form));
    const loadInTime = data.loadInTime ? `${date}T${data.loadInTime}:00` : null;
    const doorsTime = data.doorsTime ? `${date}T${data.doorsTime}:00` : null;
    const setTime = data.setTime ? `${date}T${data.setTime}:00` : null;

    const payload = {
      type: eventType,
      title: data.title,
      venue,
      city,
      state: stateField || null,
      country: country || "US",
      date: `${date}T00:00:00`,
      loadInTime,
      doorsTime: isRecording ? null : doorsTime,
      setTime,
      guarantee: isRecording ? null : data.guarantee || null,
      notes: data.notes || null,
      venueAddress: venueMeta.address || null,
      venueLat: venueMeta.lat,
      venueLng: venueMeta.lng,
      releaseId: isRecording ? releaseId || null : null,
    };

    const res = await fetch(isEdit ? `/api/shows/${event.id}` : "/api/shows", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    setConfirmingDateChange(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || `Failed to ${isEdit ? "save" : "create"} event`);
      return;
    }

    const saved = await res.json();
    router.push(eventHref(saved.type, saved.id));
    router.refresh();
  }

  // Held so the confirm dialog can submit the same form afterwards.
  const [formEl, setFormEl] = useState<HTMLFormElement | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (dateChanged) {
      setFormEl(e.currentTarget);
      setConfirmingDateChange(true);
      return;
    }
    save(e.currentTarget);
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
            {t === "SHOW" ? "Show" : "Recording"}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          {isRecording ? "Session" : "Show"} Title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          required
          defaultValue={event?.title}
          className={inputClass}
          placeholder={
            isRecording ? "e.g. Album tracking — Day 1" : "e.g. The Roxy w/ Support Act"
          }
        />
      </div>

      {isRecording && releases.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Release <span className="text-zinc-600">(optional)</span>
          </label>
          <select
            value={releaseId}
            onChange={(e) => setReleaseId(e.target.value)}
            className={inputClass}
          >
            <option value="">Not tied to a release</option>
            {releases.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          name="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
        {dateChanged && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-400">
            <AlertTriangle size={13} className="mt-px shrink-0" />
            Changing the date clears everyone&apos;s availability and returns a
            confirmed event to pending — the band will need to respond again.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          {isRecording ? "Studio" : "Venue"}
        </label>
        <VenueSearch
          value={venue}
          onValueChange={(val) => {
            setVenue(val);
            setVenueMeta(emptyMeta);
          }}
          onSelect={handleVenueSelect}
          inputClassName={inputClass}
          placeholder={isRecording ? "Search studios…" : "Search venues by name or city…"}
        />
        <p className="mt-1 text-xs text-zinc-600">
          Start typing to search; pick a result to auto-fill city, state, and address.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
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

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Country</label>
        <input
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={inputClass}
        />
      </div>

      {isRecording ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Call Time</label>
            <input
              name="loadInTime"
              type="time"
              defaultValue={event?.loadInTime}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Wrap Time</label>
            <input
              name="setTime"
              type="time"
              defaultValue={event?.setTime}
              className={inputClass}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Load In</label>
            <input
              name="loadInTime"
              type="time"
              defaultValue={event?.loadInTime}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Doors</label>
            <input
              name="doorsTime"
              type="time"
              defaultValue={event?.doorsTime}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Set Time</label>
            <input
              name="setTime"
              type="time"
              defaultValue={event?.setTime}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {!isRecording && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Guarantee ($)</label>
          <input
            name="guarantee"
            type="number"
            min="0"
            step="1"
            defaultValue={event?.guarantee}
            className={inputClass}
            placeholder="500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={event?.notes}
          className={`${inputClass} resize-none`}
          placeholder={
            isRecording ? "Engineer, gear, song list, etc." : "Parking info, contacts, etc."
          }
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        {isEdit && (
          <button
            type="button"
            onClick={() => router.push(eventHref(event.type, event.id))}
            className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : isRecording
                ? "Add Recording Session"
                : "Add Show"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDateChange}
        title="Date changed — reset availability?"
        message={
          <>
            Moving this {isRecording ? "session" : "show"} to a new date clears every
            member&apos;s availability response, including your own, and sends a
            confirmed {isRecording ? "session" : "show"} back to pending. Everyone will
            need to mark themselves available again.
          </>
        }
        confirmLabel="Save & reset"
        busy={loading}
        onConfirm={() => formEl && save(formEl)}
        onCancel={() => setConfirmingDateChange(false)}
      />
    </form>
  );
}
