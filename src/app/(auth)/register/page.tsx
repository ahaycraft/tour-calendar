"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RegisterForm() {
  const router = useRouter();
  const inviteToken = useSearchParams().get("invite");

  const [name, setName] = useState("");
  const [bandName, setBandName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<
    { valid: boolean; email?: string; bandName?: string; role?: string } | null
  >(null);

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/invites/${inviteToken}`)
      .then((r) => r.json())
      .then((data) => {
        setInvite(data);
        if (data.valid && data.email) setEmail(data.email);
      })
      .catch(() => setInvite({ valid: false }));
  }, [inviteToken]);

  const joining = !!inviteToken && invite?.valid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        bandName: joining ? undefined : bandName,
        inviteToken: joining ? inviteToken : undefined,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError((await res.json()).error || "Registration failed");
      return;
    }
    router.push("/login?registered=true");
  }

  const inputClass =
    "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60";

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-50">🎸 Tour Calendar</h1>
            <p className="text-zinc-500 mt-1">
              {joining
                ? `Join ${invite?.bandName} as ${invite?.role?.toLowerCase()}`
                : "Create your account"}
            </p>
          </div>

          {inviteToken && invite && !invite.valid && (
            <p className="text-sm text-amber-400 mb-4">
              That invite link is invalid or expired — you can still create your own band
              below.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
                placeholder="Your name"
              />
            </div>

            {!joining && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Band or artist name
                </label>
                <input
                  type="text"
                  value={bandName}
                  onChange={(e) => setBandName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Your band (you can rename it later)"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={joining}
                className={inputClass}
                placeholder="you@band.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
                placeholder="Min 8 characters"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? "Creating account..."
                : joining
                  ? "Create account & join"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
