import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AcceptInvite from "@/components/AcceptInvite";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  const invite = await prisma.bandInvite.findUnique({
    where: { token },
    include: {
      band: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  });

  const problem = !invite
    ? "This invite link isn't valid."
    : invite.acceptedAt
      ? "This invite has already been used."
      : invite.expiresAt < new Date()
        ? "This invite has expired."
        : null;

  const emailMismatch =
    invite && session && session.user.email.toLowerCase() !== invite.email;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
        <h1 className="text-2xl font-bold text-zinc-50">🎸 Tour Calendar</h1>

        {problem ? (
          <>
            <p className="text-zinc-400 mt-4">{problem}</p>
            <Link
              href="/login"
              className="inline-block mt-6 text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-zinc-300 mt-4">
              <span className="font-medium text-zinc-100">
                {invite!.invitedBy.name}
              </span>{" "}
              invited you to join{" "}
              <span className="font-medium text-zinc-100">{invite!.band.name}</span> as{" "}
              {invite!.role.toLowerCase()}.
            </p>

            {!session ? (
              <div className="mt-6 space-y-2">
                <p className="text-sm text-zinc-500">
                  Sign in or create an account for{" "}
                  <span className="text-zinc-300">{invite!.email}</span> to accept.
                </p>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                  className="block w-full text-center py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href={`/register?invite=${token}`}
                  className="block w-full text-center py-2 px-4 border border-zinc-700 text-zinc-200 font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Create account
                </Link>
              </div>
            ) : emailMismatch ? (
              <p className="text-sm text-amber-400 mt-4">
                You&apos;re signed in as {session.user.email}, but this invite is for{" "}
                {invite!.email}. Sign out and use that address.
              </p>
            ) : (
              <AcceptInvite token={token} bandName={invite!.band.name} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
