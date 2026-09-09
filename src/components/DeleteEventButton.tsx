"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import { revalidateShell } from "@/app/(protected)/actions";

/**
 * Deliberately separate from the Admin Actions button row (Confirm/Pending/
 * Cancel) and pinned to the bottom of the page — same placement as "Delete
 * this group" in BandSettings — so an irreversible action isn't sitting
 * next to buttons someone taps routinely.
 */
export default function DeleteEventButton({
  showId,
  noun = "show",
  basePath = "/shows"
}: {
  showId: string;
  noun?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function doDelete() {
    setBusy(true);
    await fetch(`/api/shows/${showId}`, { method: "DELETE" });
    await revalidateShell();
    router.push(basePath);
    router.refresh();
  }

  return (
    <div className="mt-6 flex justify-center sm:justify-start">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-red-400 hover:text-red-300"
      >
        Delete this {noun}
      </button>

      <ConfirmDialog
        open={confirming}
        title={`Delete this ${noun}?`}
        message="This cannot be undone. All availability responses for it will be removed too."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
