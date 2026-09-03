"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, X } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

type Role = "OWNER" | "ADMIN" | "MEMBER";

interface Member {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

interface PendingInvite {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  token: string;
  expiresAt: string;
}

const fieldClass =
  "px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function BandSettings({
  bandId,
  bandName,
  myRole,
  myUserId,
  members,
  pendingInvites,
}: {
  bandId: string;
  bandName: string;
  myRole: Role;
  myUserId: string;
  members: Member[];
  pendingInvites: PendingInvite[];
}) {
  const router = useRouter();

  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const isOwner = myRole === "OWNER";
  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  const [name, setName] = useState(bandName);
  const [nameSaved, setNameSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const inviteUrl = (token: string) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/invite/${token}`;

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — the field is still selectable */
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteBusy(true);
    setError("");
    const res = await fetch(`/api/bands/${bandId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    setInviteBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't create invite");
      return;
    }
    const { token } = await res.json();
    setInviteEmail("");
    await copyLink(token);
    router.refresh();
  }

  async function revokeInvite(inviteId: string) {
    setError("");
    const res = await fetch(`/api/bands/${bandId}/invites/${inviteId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't revoke");
      return;
    }
    router.refresh();
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === bandName) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/bands/${bandId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't rename");
      return;
    }
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
    router.refresh();
  }

  async function changeRole(userId: string, role: Role) {
    setError("");
    const res = await fetch(`/api/bands/${bandId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't change role");
      return;
    }
    router.refresh();
  }

  async function removeMember(userId: string) {
    setError("");
    const res = await fetch(`/api/bands/${bandId}/members/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't remove member");
      return;
    }
    router.refresh();
  }

  async function leaveBand() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/bands/${bandId}/members/${myUserId}`, {
      method: "DELETE",
    });
    setBusy(false);
    setLeaving(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't leave");
      return;
    }
    router.push("/calendar");
    router.refresh();
  }

  async function deleteBand() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/bands/${bandId}`, { method: "DELETE" });
    setBusy(false);
    setDeleting(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't delete band");
      return;
    }
    router.push("/calendar");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Band settings</h1>

      {/* Name */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
        <h2 className="font-semibold text-zinc-100 mb-3">Name</h2>
        {canManage ? (
          <form onSubmit={saveName} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${fieldClass} flex-1`}
            />
            <button
              type="submit"
              disabled={busy || !name.trim() || name.trim() === bandName}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : nameSaved ? <Check size={15} /> : "Save"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-zinc-300">{bandName}</p>
        )}
      </div>

      {/* Members */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
        <h2 className="font-semibold text-zinc-100 mb-4">
          Members
          <span className="text-sm font-normal text-zinc-500 ml-2">{members.length}</span>
        </h2>
        <ul className="divide-y divide-zinc-800">
          {members.map((m) => {
            const isMe = m.userId === myUserId;
            const lastOwner = m.role === "OWNER" && ownerCount <= 1;
            return (
              <li key={m.userId} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-200">
                    {m.name}
                    {isMe && <span className="text-zinc-600"> (you)</span>}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{m.email}</p>
                </div>

                {isOwner && !isMe ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.userId, e.target.value as Role)}
                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                  </select>
                ) : (
                  <span className="text-xs text-zinc-500 capitalize">
                    {m.role.toLowerCase()}
                  </span>
                )}

                {isOwner && !isMe && !lastOwner && (
                  <button
                    type="button"
                    onClick={() => removeMember(m.userId)}
                    className="text-xs text-zinc-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Invites */}
      {canManage && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
          <h2 className="font-semibold text-zinc-100 mb-1">Invite people</h2>
          <p className="text-xs text-zinc-500 mb-4">
            Creates a link to send them. It works for 14 days and only for that email.
          </p>

          <form onSubmit={sendInvite} className="flex flex-wrap gap-2 mb-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="bandmate@email.com"
              className={`${fieldClass} flex-1 min-w-[180px]`}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
              className={fieldClass}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviteBusy || !inviteEmail.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {inviteBusy ? <Loader2 size={15} className="animate-spin" /> : "Create link"}
            </button>
          </form>

          {pendingInvites.length > 0 && (
            <ul className="divide-y divide-zinc-800">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200 truncate">{inv.email}</p>
                    <p className="text-xs text-zinc-500">
                      {inv.role.toLowerCase()} · expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyLink(inv.token)}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copied === inv.token ? <Check size={13} /> : <Copy size={13} />}
                    {copied === inv.token ? "Copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => revokeInvite(inv.id)}
                    className="text-zinc-600 hover:text-red-400"
                    aria-label="Revoke invite"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setLeaving(true)}
          className="text-sm text-red-400 hover:text-red-300"
        >
          Leave this band
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Delete this band
          </button>
        )}
      </div>

      <ConfirmDialog
        open={leaving}
        title={`Leave ${bandName}?`}
        message="You'll lose access to this band's calendar, songs, and releases until someone adds you back."
        confirmLabel="Leave"
        tone="danger"
        busy={busy}
        onConfirm={leaveBand}
        onCancel={() => setLeaving(false)}
      />

      <ConfirmDialog
        open={deleting}
        title={`Delete ${bandName}?`}
        message={
          <>
            This permanently deletes <span className="font-medium text-zinc-200">{bandName}</span>{" "}
            and every show, recording, song, and release in it, for everyone. This
            can&apos;t be undone.
          </>
        }
        confirmLabel="Delete band"
        tone="danger"
        busy={busy}
        onConfirm={deleteBand}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
