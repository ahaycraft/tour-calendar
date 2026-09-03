"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 pb-3">
          <h2 className="text-base font-semibold text-zinc-50">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 -m-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 text-sm text-zinc-400">{message}</div>

        <div className="flex justify-end gap-2 p-5 pt-4">
          <button
            onClick={onCancel}
            type="button"
            disabled={busy}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            type="button"
            disabled={busy}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
              tone === "danger"
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
