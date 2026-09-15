"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

const fieldClass =
  "px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function AccountSettings({
  name: initialName,
  email,
  phone: initialPhone
}: {
  name: string;
  email: string;
  phone: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dirty =
    name.trim() !== initialName || phone.trim() !== (initialPhone ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !dirty) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null })
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't save");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-50 mb-6">My Account</h1>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${fieldClass} w-full`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Email
            </label>
            <p className="text-sm text-zinc-500">{email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Add a phone number"
              className={`${fieldClass} w-full`}
            />
            <p className="text-xs text-zinc-500 mt-1.5">
              Shown to your bandmates so they can text you.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy || !name.trim() || !dirty}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : saved ? (
              <Check size={15} />
            ) : (
              "Save"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
