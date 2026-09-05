"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import SwipeableReleaseRow from "./SwipeableReleaseRow";

interface Release {
  id: string;
  title: string;
  kind: string;
  status: string;
  trackCount: number;
  createdAt: string;
  targetDate: string | null;
  canDelete: boolean;
}

export default function ReleasesList({ initialReleases }: { initialReleases: Release[] }) {
  const router = useRouter();
  const [releases, setReleases] = useState(initialReleases);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/releases/${pendingDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setReleases((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      setPendingDelete(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      {releases.map((release) => (
        <SwipeableReleaseRow
          key={release.id}
          release={release}
          canDelete={release.canDelete}
          awaitingConfirm={pendingDelete?.id === release.id}
          onDeleteRequest={setPendingDelete}
        />
      ))}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this release?"
        message={
          <>
            {pendingDelete && (
              <>
                &ldquo;{pendingDelete.title}&rdquo; and its tracklist are removed. The
                songs themselves stay in your library.
              </>
            )}
          </>
        }
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
