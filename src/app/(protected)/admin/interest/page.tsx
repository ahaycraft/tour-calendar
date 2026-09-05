import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { interestRoleLabel } from "@/lib/interest";

// Global-admin only (User.role, separate from per-band OWNER/ADMIN/MEMBER) —
// 404 rather than redirect, so the route's existence isn't hinted at.
export default async function AdminInterestPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") notFound();

  const submissions = await prisma.interestSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Interest submissions</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Waitlist signups from the public &ldquo;Express interest&rdquo; form.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-10 text-center">
          <p className="text-zinc-400 text-sm">No submissions yet.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-b border-zinc-800 last:border-0">
                  <td className="px-4 py-3 text-zinc-100 whitespace-nowrap">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    <a href={`mailto:${s.email}`} className="hover:text-blue-400 hover:underline">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
