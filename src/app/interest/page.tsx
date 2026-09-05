"use client";

import { useState } from "react";
import Link from "next/link";
import { INTEREST_ROLES, interestRoleLabel } from "@/lib/interest";

const inputClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60";

export default function InterestPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, role }),
    });

    setLoading(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Something went wrong");
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
          {submitted ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-50 mb-2">Thanks!</h1>
              <p className="text-zinc-400">
                We&apos;ve got your info and will reach out when Woodshedd opens up.
              </p>
              <Link
                href="/login"
                className="inline-block mt-6 text-sm text-blue-400 hover:text-blue-300"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-zinc-50">Express interest</h1>
                <p className="text-zinc-500 mt-1">
                  Woodshedd is invite-only right now. Leave your info and
                  we&apos;ll reach out when there&apos;s room.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      First name
                    </label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Last name
                    </label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className={inputClass}
                    placeholder="you@band.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    I&apos;m a...
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    disabled={loading}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    {INTEREST_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {interestRoleLabel[r]}
                      </option>
                    ))}
                  </select>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </form>

              <Link
                href="/login"
                className="block mt-6 text-center text-sm text-zinc-500 hover:text-zinc-300"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
