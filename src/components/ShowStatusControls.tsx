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
  noun?: string;
}

export default function ShowStatusControls({
  showId,
  currentStatus,
  availableCount,
  memberCount,
  noun = "show"
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmingAnyway, setConfirmingAnyway] = useState(false);

  const Noun = noun[0].toUpperCase() + noun.slice(1);
  const everyoneAvailable = memberCount > 0 && availableCount >= memberCount;

  async function doUpdateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/shows/${showId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await revalidateShell();
    setLoading(false);
    setConfirmingAnyway(false);
    router.refresh();
  }

  function onStatusClick(status: string) {
    if (status === "CONFIRMED" && !everyoneAvailable) {
      setConfirmingAnyway(true);
      return;
    }
    doUpdateStatus(status);
  }

  return (
    <div className="mt-5 pt-5 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
          Admin Actions
        </p>
        <p
          className={`text-xs font-medium ${
            everyoneAvailable ? "tone-moss" : "tone-ochre"
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
            className="px-3 py-1.5 text-sm rounded-lg badge-moss hover:opacity-80 font-medium transition-opacity disabled:opacity-50"
          >
            Confirm {Noun}
          </button>
        )}
        {currentStatus !== "PENDING" && (
          <button
            onClick={() => onStatusClick("PENDING")}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg badge-denim hover:opacity-80 font-medium transition-opacity disabled:opacity-50"
          >
            Mark Pending
          </button>
        )}
        {currentStatus !== "CANCELLED" && (
          <button
            onClick={() => onStatusClick("CANCELLED")}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg badge-brick hover:opacity-80 font-medium transition-opacity disabled:opacity-50"
          >
            Cancel {Noun}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmingAnyway}
        title={`Confirm ${noun} anyway?`}
        message={
          <>
            Only{" "}
            <span className="font-medium text-zinc-200">{availableCount}</span>{" "}
            of {memberCount} members have marked available. You can still
            confirm this {noun}.
          </>
        }
        confirmLabel={`Confirm ${Noun}`}
        busy={loading}
        onConfirm={() => doUpdateStatus("CONFIRMED")}
        onCancel={() => setConfirmingAnyway(false)}
      />
    </div>
  );
}
