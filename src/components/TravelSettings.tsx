"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bed, Check, Copy, Loader2, Plane, X } from "lucide-react";
import { AIRLINE_PROGRAMS, HOTEL_PROGRAMS, OTHER_PROGRAM } from "@/lib/travel-programs";

type LoyaltyType = "HOTEL" | "AIRLINE";

interface LoyaltyAccount {
  id: string;
  type: LoyaltyType;
  program: string;
  memberNumber: string;
}

interface Bandmate {
  userId: string;
  name: string;
  accounts: LoyaltyAccount[];
}

const fieldClass =
  "px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const TYPE_ICON: Record<LoyaltyType, typeof Bed> = { HOTEL: Bed, AIRLINE: Plane };

function AccountRow({
  account,
  action
}: {
  account: LoyaltyAccount;
  action: React.ReactNode;
}) {
  const Icon = TYPE_ICON[account.type];
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon size={16} className="text-zinc-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-200">{account.program}</p>
        <p className="text-xs text-zinc-500">{account.memberNumber}</p>
      </div>
      {action}
    </div>
  );
}

export default function TravelSettings({
  myAccounts,
  bandmates
}: {
  myAccounts: LoyaltyAccount[];
  bandmates: Bandmate[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<LoyaltyType>("HOTEL");
  const [program, setProgram] = useState("");
  const [customProgram, setCustomProgram] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const programOptions = type === "HOTEL" ? HOTEL_PROGRAMS : AIRLINE_PROGRAMS;
  const resolvedProgram = program === OTHER_PROGRAM ? customProgram.trim() : program;

  function resetForm() {
    setAdding(false);
    setType("HOTEL");
    setProgram("");
    setCustomProgram("");
    setMemberNumber("");
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedProgram || !memberNumber.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/account/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, program: resolvedProgram, memberNumber: memberNumber.trim() })
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't save");
      return;
    }
    resetForm();
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/account/loyalty/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard blocked — the number is still selectable on the page */
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-50 mb-1">Travel & Rewards</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Hotel and airline loyalty numbers, for whoever&apos;s booking travel to copy.
      </p>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-zinc-100">My accounts</h2>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Add
            </button>
          )}
        </div>

        {myAccounts.length === 0 && !adding && (
          <p className="text-sm text-zinc-500 mt-2">No loyalty accounts saved yet.</p>
        )}

        {myAccounts.length > 0 && (
          <div className="divide-y divide-zinc-800">
            {myAccounts.map((a) => (
              <AccountRow
                key={a.id}
                account={a}
                action={
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    aria-label={`Remove ${a.program}`}
                    className="text-zinc-600 hover:text-red-400"
                  >
                    <X size={15} />
                  </button>
                }
              />
            ))}
          </div>
        )}

        {adding && (
          <form onSubmit={save} className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex gap-2">
              {(["HOTEL", "AIRLINE"] as LoyaltyType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setProgram("");
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    t === type
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t === "HOTEL" ? "Hotel" : "Airline"}
                </button>
              ))}
            </div>

            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className={`${fieldClass} w-full`}
            >
              <option value="" disabled>
                Choose a program
              </option>
              {programOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value={OTHER_PROGRAM}>Other</option>
            </select>

            {program === OTHER_PROGRAM && (
              <input
                value={customProgram}
                onChange={(e) => setCustomProgram(e.target.value)}
                placeholder="Program name"
                className={`${fieldClass} w-full`}
              />
            )}

            <input
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              placeholder="Member number"
              className={`${fieldClass} w-full`}
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || !resolvedProgram || !memberNumber.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : "Save"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {bandmates
        .filter((m) => m.accounts.length > 0)
        .map((m) => (
          <div
            key={m.userId}
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6"
          >
            <h2 className="font-semibold text-zinc-100 mb-1">{m.name}</h2>
            <div className="divide-y divide-zinc-800">
              {m.accounts.map((a) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  action={
                    <button
                      type="button"
                      onClick={() => copy(a.memberNumber, a.id)}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      {copiedId === a.id ? <Check size={13} /> : <Copy size={13} />}
                      {copiedId === a.id ? "Copied" : "Copy"}
                    </button>
                  }
                />
              ))}
            </div>
          </div>
        ))}

      {bandmates.every((m) => m.accounts.length === 0) && (
        <p className="text-sm text-zinc-500">No bandmates have saved travel rewards yet.</p>
      )}
    </div>
  );
}
