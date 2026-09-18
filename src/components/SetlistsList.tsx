"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListMusic, X } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface SetlistRow {
  id: string;
  name: string;
  songCount: number;
}

export default function SetlistsList({ initial }: { initial: SetlistRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doDelete(id: string) {
    setBusy(true);
    await fetch(`/api/setlists/${id}`, { method: "DELETE" });
    setBusy(false);
    setDeletingId(null);
    router.refresh();
  }

  const deleting = initial.find((s) => s.id === deletingId);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 divide-y divide-zinc-800">
      {initial.map((s) => (
        <div key={s.id} className="flex items-center gap-3 px-6 py-4">
          <ListMusic size={16} className="text-zinc-500 shrink-0" />
          <Link
            href={`/setlists/${s.id}`}
            className="min-w-0 flex-1 text-sm font-medium text-zinc-100 hover:text-blue-400 hover:underline underline-offset-2"
          >
            {s.name}
          </Link>
          <span className="text-xs text-zinc-500 shrink-0">
            {s.songCount} song{s.songCount === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => setDeletingId(s.id)}
            aria-label={`Delete ${s.name}`}
            className="text-zinc-600 hover:text-red-400 shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      ))}

      <ConfirmDialog
        open={!!deleting}
        title={`Delete "${deleting?.name}"?`}
        message="Shows that already applied this setlist keep their own copy — only the reusable template is removed."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={() => deleting && doDelete(deleting.id)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
