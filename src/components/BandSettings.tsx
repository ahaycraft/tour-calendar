"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, Copy, Loader2, MessageCircle, Pencil, X } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { roleLabel } from "@/lib/role-label";

type Role = "OWNER" | "ADMIN" | "MANAGER" | "TOUR_MANAGER" | "BOOKING_AGENT" | "MEMBER";
type InviteRole = Exclude<Role, "OWNER">;
const INVITE_ROLES: InviteRole[] = [
  "ADMIN",
  "MANAGER",
  "TOUR_MANAGER",
  "BOOKING_AGENT",
  "MEMBER"
];

interface Member {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
}

interface PendingInvite {
  id: string;
  email: string;
  phone: string | null;
  role: InviteRole;
  token: string;
  expiresAt: string;
}

const fieldClass =
  "px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function BandSettings({
  bandId,
  bandName,
  bandRider,
  myRole,
  myUserId,
  members,
  pendingInvites
}: {
  bandId: string;
  bandName: string;
  bandRider: string | null;
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
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState(false);

  const [rider, setRider] = useState(bandRider ?? "");
  const [editingRider, setEditingRider] = useState(false);
  const [riderBusy, setRiderBusy] = useState(false);

  const me = members.find((m) => m.userId === myUserId);
  const bandPhones = Array.from(
    new Set(
      members
        .filter((m) => m.userId !== myUserId && m.phone)
        .map((m) => m.phone as string)
    )
  );
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("MEMBER");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const inviteUrl = (token: string) =>
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/invite/${token}`;

  const textLinkHref = (invite: PendingInvite) =>
    `sms:${invite.phone}?body=${encodeURIComponent(
      `Here's your sign-up link for ${bandName}: ${inviteUrl(invite.token)}`
    )}`;

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
      body: JSON.stringify({
        email: inviteEmail,
        phone: invitePhone,
        role: inviteRole
      })
    });
    setInviteBusy(false);
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}))).error || "Couldn't create invite"
      );
      return;
    }
    const { token } = await res.json();
    setInviteEmail("");
    setInvitePhone("");
    await copyLink(token);
    router.refresh();
  }

  async function revokeInvite(inviteId: string) {
    setError("");
    const res = await fetch(`/api/bands/${bandId}/invites/${inviteId}`, {
      method: "DELETE"
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
      body: JSON.stringify({ name })
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't rename");
      return;
    }
    setEditingName(false);
    router.refresh();
  }

  function cancelEditName() {
    setName(bandName);
    setEditingName(false);
    setError("");
  }

  async function saveRider(e: React.FormEvent) {
    e.preventDefault();
    if (rider === (bandRider ?? "")) return;
    setRiderBusy(true);
    setError("");
    const res = await fetch(`/api/bands/${bandId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rider })
    });
    setRiderBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't save rider");
      return;
    }
    setEditingRider(false);
    router.refresh();
  }

  function cancelEditRider() {
    setRider(bandRider ?? "");
    setEditingRider(false);
    setError("");
  }

  async function changeRole(userId: string, role: Role) {
    setError("");
    const res = await fetch(`/api/bands/${bandId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}))).error || "Couldn't change role"
      );
      return;
    }
    router.refresh();
  }

  async function removeMember(userId: string) {
    setError("");
    const res = await fetch(`/api/bands/${bandId}/members/${userId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}))).error || "Couldn't remove member"
      );
      return;
    }
    router.refresh();
  }

  async function leaveBand() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/bands/${bandId}/members/${myUserId}`, {
      method: "DELETE"
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
      setError(
        (await res.json().catch(() => ({}))).error || "Couldn't delete group"
      );
      return;
    }
    router.push("/calendar");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Group settings</h1>

      {/* Name */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
        <h2 className="font-semibold text-zinc-100 mb-3">Name</h2>
        {canManage ? (
          editingName ? (
            <form onSubmit={saveName} className="space-y-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${fieldClass} w-full`}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || !name.trim() || name.trim() === bandName}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditName}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-200 truncate">{name}</p>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 shrink-0"
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>
          )
        ) : (
          <p className="text-sm text-zinc-300">{bandName}</p>
        )}
      </div>

      {/* Rider */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
        <h2 className="font-semibold text-zinc-100 mb-1">Rider</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Hospitality/tech requirements sent to a show&apos;s venue contact.
          One rider for the whole band — it doesn&apos;t vary per show.
        </p>
        {canManage ? (
          editingRider ? (
            <form onSubmit={saveRider} className="space-y-2">
              <textarea
                autoFocus
                rows={8}
                value={rider}
                onChange={(e) => setRider(e.target.value)}
                className={`${fieldClass} w-full resize-y`}
                placeholder="Backline, hospitality, stage plot, etc."
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={riderBusy || rider === (bandRider ?? "")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {riderBusy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    "Save"
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelEditRider}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                {bandRider || (
                  <span className="text-zinc-500">No rider set yet.</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setEditingRider(true)}
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 shrink-0"
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>
          )
        ) : (
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">
            {bandRider || (
              <span className="text-zinc-500">No rider set yet.</span>
            )}
          </p>
        )}
      </div>

      {/* Members */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-zinc-100">
            Members
            <span className="text-sm font-normal text-zinc-500 ml-2">
              {members.length}
            </span>
          </h2>
          {bandPhones.length > 0 && (
            <a
              href={`sms:${bandPhones.join(",")}`}
              className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 shrink-0"
            >
              <MessageCircle size={14} />
              Text group
            </a>
          )}
        </div>
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
                  {isMe ? (
                    <Link
                      href="/account"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Pencil size={11} />
                      {me?.phone || "Add your phone number"}
                    </Link>
                  ) : (
                    m.phone && (
                      <a
                        href={`sms:${m.phone}`}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        <MessageCircle size={12} />
                        Text {m.name.split(" ")[0]}
                      </a>
                    )
                  )}
                </div>

                {isOwner && !isMe ? (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      changeRole(m.userId, e.target.value as Role)
                    }
                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="TOUR_MANAGER">Tour Manager</option>
                    <option value="BOOKING_AGENT">Booking Agent</option>
                    <option value="MEMBER">Member</option>
                  </select>
                ) : (
                  <span className="text-xs text-zinc-500">
                    {roleLabel(m.role)}
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
            Creates a link to send them. It works for 14 days and only for that
            email. Add a phone number to text it to them instead of copying it
            yourself.
          </p>

          <form onSubmit={sendInvite} className="flex flex-col gap-2 mb-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="member@group.com"
              className={`${fieldClass} w-full`}
            />
            <div className="flex gap-2">
              <input
                type="tel"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="Phone (optional)"
                className={`${fieldClass} flex-1 min-w-0`}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                className={`${fieldClass} shrink-0`}
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={inviteBusy || !inviteEmail.trim()}
              className="self-start px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {inviteBusy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                "Create link"
              )}
            </button>
          </form>

          {pendingInvites.length > 0 && (
            <ul className="divide-y divide-zinc-800">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200 truncate">
                      {inv.email}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {roleLabel(inv.role)} · expires{" "}
                      {format(new Date(inv.expiresAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  {inv.phone && (
                    <a
                      href={textLinkHref(inv)}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <MessageCircle size={13} />
                      Text link
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => copyLink(inv.token)}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copied === inv.token ? (
                      <Check size={13} />
                    ) : (
                      <Copy size={13} />
                    )}
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
          Leave this group
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Delete this group
          </button>
        )}
      </div>

      <ConfirmDialog
        open={leaving}
        title={`Leave ${bandName}?`}
        message="You'll lose access to this group's calendar, songs, and releases until someone adds you back."
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
            This permanently deletes{" "}
            <span className="font-medium text-zinc-200">{bandName}</span> and
            every show, recording, song, and release in it, for everyone. This
            can&apos;t be undone.
          </>
        }
        confirmLabel="Delete group"
        tone="danger"
        busy={busy}
        onConfirm={deleteBand}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
