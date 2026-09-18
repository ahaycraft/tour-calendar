"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";

interface Template {
  id: string;
  name: string;
}

export default function ApplySetlistToTour({
  tourGroupId,
  dayCount,
  templates,
  noun
}: {
  tourGroupId: string;
  dayCount: number;
  templates: Template[];
  noun: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function apply() {
    if (!pendingId) return;
    setApplying(true);
    setError("");
    const res = await fetch("/api/shows/bulk/setlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourGroupId, setlistId: pendingId })
    });
    setApplying(false);
    setPendingId(null);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't apply setlist");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (templates.length === 0) return null;

  const pendingName = templates.find((t) => t.id === pendingId)?.name;

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mt-6">
      <h2 className="font-semibold text-zinc-100 mb-1">Apply a setlist</h2>
      <p className="text-sm text-zinc-500 mb-3">
        Sets every day in this {noun} to a fresh copy of the template. Each
        day&apos;s copy can still be edited on its own from there.
      </p>
      <select
        value=""
        onChange={(e) => e.target.value && setPendingId(e.target.value)}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Choose a setlist…</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      {done && <p className="text-sm text-zinc-500 mt-2">Applied to all {dayCount} days.</p>}

      <ConfirmDialog
        open={!!pendingId}
        title={`Apply "${pendingName}" to every day?`}
        message={`This replaces the current setlist on all ${dayCount} days in this ${noun} with a fresh copy of the template.`}
        confirmLabel="Apply to all"
        busy={applying}
        onConfirm={apply}
        onCancel={() => setPendingId(null)}
      />
    </div>
  );
}
