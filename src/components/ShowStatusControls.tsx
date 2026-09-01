"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  showId: string;
  currentStatus: string;
}

export default function ShowStatusControls({ showId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/shows/${showId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  async function deleteShow() {
    if (!confirm("Delete this show? This cannot be undone.")) return;
    setLoading(true);
    await fetch(`/api/shows/${showId}`, { method: "DELETE" });
    router.push("/shows");
    router.refresh();
  }

  return (
    <div className="mt-5 pt-5 border-t border-zinc-800">
      <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-2">Admin Actions</p>
      <div className="flex gap-2 flex-wrap">
        {currentStatus !== "CONFIRMED" && (
          <button
            onClick={() => updateStatus("CONFIRMED")}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 font-medium transition-colors disabled:opacity-50"
          >
            Confirm Show
          </button>
        )}
        {currentStatus !== "PENDING" && (
          <button
            onClick={() => updateStatus("PENDING")}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 font-medium transition-colors disabled:opacity-50"
          >
            Mark Pending
          </button>
        )}
        {currentStatus !== "CANCELLED" && (
          <button
            onClick={() => updateStatus("CANCELLED")}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 font-medium transition-colors disabled:opacity-50"
          >
            Cancel Show
          </button>
        )}
        <button
          onClick={deleteShow}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded-lg border border-red-900 text-red-400 hover:bg-red-900/30 font-medium transition-colors disabled:opacity-50 ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
