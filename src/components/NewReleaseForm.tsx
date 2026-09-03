"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RELEASE_KINDS, releaseKindLabel } from "@/lib/releases";

const inputClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function NewReleaseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("ALBUM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError("");
    setLoading(true);

    const res = await fetch("/api/releases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, kind }),
    });

    setLoading(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Failed to create release");
      return;
    }

    const release = await res.json();
    router.push(`/releases/${release.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          autoFocus
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="e.g. Second LP"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Kind</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={inputClass}
        >
          {RELEASE_KINDS.map((k) => (
            <option key={k} value={k}>
              {releaseKindLabel[k]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !title.trim()}
        className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creating..." : "Create Release"}
      </button>
    </form>
  );
}
