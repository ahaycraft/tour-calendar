"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import { revalidateShell } from "@/app/(protected)/actions";

interface Props {
  showId: string;
  currentStatus: string;
  availableCount: number;
  memberCount: number;
  noun?: "show" | "session";
}

export default function ShowStatusControls({
  showId,
  currentStatus,
  availableCount,
  memberCount,
  noun = "show",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<null | "confirm-anyway" | "delete">(null);

  const Noun = noun[0].toUpperCase() + noun.slice(1);
  const everyoneAvailable = memberCount > 0 && availableCount >= memberCount;

  async function doUpdateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/shows/${showId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await revalidateShell();
    setLoading(false);
    setPending(null);
    router.refresh();
  }

  function onStatusClick(status: string) {
    if (status === "CONFIRMED" && !everyoneAvailable) {
      setPending("confirm-anyway");
      return;
    }
    doUpdateStatus(status);
  }

  async function doDelete() {
    setLoading(true);
    await fetch(`/api/shows/${showId}`, { method: "DELETE" });
    await revalidateShell();
    router.push(noun === "session" ? "/recordings" : "/shows");
    router.refresh();
  }

  return (
    <div className="mt-5 pt-5 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
          Admin Actions
        </p>
        <p
          className={`text-xs font-medium ${
            everyoneAvailable ? "text-green-400" : "text-amber-400"
          }`}
        >
          {availableCount} of {memberCount} available
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {currentStatus !== "CONFIRMED" && (
          <button
            onClick={() => onStatusClick("CONFIRMED")}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 font-medium transition-colors disabled:opacity-50"
          >
            Confirm {Noun}
          </button>
        )}
        {currentStatus !== "PENDING" && (
          <button
            onClick={() => onStatusClick("PENDING")}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 font-medium transition-colors disabled:opacity-50"
          >
            Mark Pending
          </button>
        )}
        {currentStatus !== "CANCELLED" && (
          <button
            onClick={() => onStatusClick("CANCELLED")}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 font-medium transition-colors disabled:opacity-50"
          >
            Cancel {Noun}
          </button>
        )}
        <button
          onClick={() => setPending("delete")}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded-lg border border-red-900 text-red-400 hover:bg-red-900/30 font-medium transition-colors disabled:opacity-50 ml-auto"
        >
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={pending === "confirm-anyway"}
        title={`Confirm ${noun} anyway?`}
        message={
          <>
            Only <span className="font-medium text-zinc-200">{availableCount}</span> of{" "}
            {memberCount} members have marked available. You can still confirm this {noun}.
          </>
        }
        confirmLabel={`Confirm ${Noun}`}
        busy={loading}
        onConfirm={() => doUpdateStatus("CONFIRMED")}
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending === "delete"}
        title={`Delete this ${noun}?`}
        message="This cannot be undone. All availability responses for it will be removed too."
        confirmLabel="Delete"
        tone="danger"
        busy={loading}
        onConfirm={doDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
