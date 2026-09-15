import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { corsPreflight, withCors } from "@/lib/cors";

// "Who am I" for the mobile app — its bearer token is an encrypted JWE, so
// the client can't just decode its own id out of the token client-side.
export async function GET(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, email, role } = session.user;
    return NextResponse.json({ id, name, email, role });
  });
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}
