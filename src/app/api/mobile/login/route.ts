import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { mintMobileToken } from "@/auth/mobile";

// Mints a bearer token for native clients, which have no cookie jar to hold
// the NextAuth session cookie web login uses. Mirrors the Credentials
// provider's authorize() in src/auth/index.ts exactly, so the two never
// silently diverge on what counts as valid credentials.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const token = await mintMobileToken({ id: user.id, role: user.role });
  return NextResponse.json({ token });
}
