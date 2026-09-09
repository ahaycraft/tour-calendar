import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InterestTable from "@/components/InterestTable";

// Global-admin only (User.role, separate from per-band OWNER/ADMIN/MEMBER) —
// 404 rather than redirect, so the route's existence isn't hinted at.
export default async function AdminInterestPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") notFound();

  const submissions = await prisma.interestSubmission.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">
          Interest submissions
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Waitlist signups from the public &ldquo;Express interest&rdquo; form.
          Check a row off once you&apos;ve followed up with them.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-10 text-center">
          <p className="text-zinc-400 text-sm">No submissions yet.</p>
        </div>
      ) : (
        <InterestTable
          initialSubmissions={submissions.map((s) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            role: s.role,
            createdAt: s.createdAt.toISOString(),
            contactedAt: s.contactedAt ? s.contactedAt.toISOString() : null
          }))}
        />
      )}
    </div>
  );
}
