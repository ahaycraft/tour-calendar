"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface Props {
  songId: string;
  currentUserId: string;
  isAdmin: boolean;
  initialComments: Comment[];
}

export default function SongComments({
  songId,
  currentUserId,
  isAdmin,
  initialComments,
}: Props) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError("");

    const res = await fetch(`/api/songs/${songId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });

    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Couldn't post comment");
      return;
    }

    const created = await res.json();
    setComments((prev) => [...prev, created]);
    setBody("");
  }

  async function remove(id: string) {
    const snapshot = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    const res = await fetch(`/api/songs/${songId}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: id }),
    });
    if (!res.ok) setComments(snapshot); // put it back
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      <h2 className="font-semibold text-zinc-100 mb-4">
        Feedback
        <span className="text-sm font-normal text-zinc-500 ml-2">{comments.length}</span>
      </h2>

      {comments.length === 0 ? (
        <p className="text-sm text-zinc-500 mb-4">
          No notes yet. Leave one so there&apos;s a record of what worked and what
          didn&apos;t.
        </p>
      ) : (
        <ul className="space-y-4 mb-5">
          {comments.map((c) => (
            <li key={c.id} className="group">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-zinc-200">{c.user.name}</span>
                <span className="text-xs text-zinc-600">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </span>
                {(isAdmin || c.user.id === currentUserId) && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="ml-auto text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete comment"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap mt-0.5">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="What do you think of this one?"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}
