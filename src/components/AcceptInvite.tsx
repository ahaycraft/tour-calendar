"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInvite({
  token,
  bandName,
}: {
  token: string;
  bandName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't accept the invite");
      setBusy(false);
      return;
    }
    router.push("/calendar");
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? "Joining…" : `Join ${bandName}`}
      </button>
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  );
}
