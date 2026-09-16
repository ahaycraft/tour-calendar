import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { corsPreflight, withCors } from "@/lib/cors";

// "Who am I" for the mobile app — its bearer token is an encrypted JWE, so
// the client can't just decode its own id out of the token client-side.
export async function GET(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, email, role } = session.user;
    // phone isn't on the session (see src/auth/index.ts), so the account
    // screen needs it looked up directly, same as the web app's /account
    // server component does.
    const user = await prisma.user.findUnique({
      where: { id },
      select: { phone: true }
    });
    return NextResponse.json({ id, name, email, role, phone: user?.phone ?? null });
  });
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}
