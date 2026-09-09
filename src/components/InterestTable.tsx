"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { interestRoleLabel, type InterestRoleStr } from "@/lib/interest";

interface Submission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: InterestRoleStr;
  createdAt: string;
  contactedAt: string | null;
}

export default function InterestTable({
  initialSubmissions
}: {
  initialSubmissions: Submission[];
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [pending, setPending] = useState<Set<string>>(new Set());

  async function toggleContacted(id: string, contacted: boolean) {
    // Optimistic — flip immediately, roll back if the request fails.
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, contactedAt: contacted ? new Date().toISOString() : null }
          : s
      )
    );
    setPending((prev) => new Set(prev).add(id));

    const res = await fetch(`/api/interest/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacted })
    });

    setPending((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (!res.ok) {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, contactedAt: contacted ? null : new Date().toISOString() }
            : s
        )
      );
    }
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 font-medium">Contacted</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => {
            const contacted = s.contactedAt !== null;
            return (
              <tr
                key={s.id}
                className={`border-b border-zinc-800 last:border-0 ${contacted ? "opacity-50" : ""}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={contacted}
                    disabled={pending.has(s.id)}
                    onChange={(e) => toggleContacted(s.id, e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                    aria-label={`Mark ${s.firstName} ${s.lastName} as contacted`}
                  />
                </td>
                <td className="px-4 py-3 text-zinc-100 whitespace-nowrap">
                  {s.firstName} {s.lastName}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  <a
                    href={`mailto:${s.email}`}
                    className="hover:text-blue-400 hover:underline"
                  >
                    {s.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                  {interestRoleLabel[s.role]}
                </td>
                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                  {formatDate(s.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
