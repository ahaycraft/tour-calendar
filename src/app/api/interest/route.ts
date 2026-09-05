import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isInterestRole } from "@/lib/interest";
import { isEmail, normalizeEmail } from "@/lib/invites";

// Public — no auth. The app is invite-only, so this is how prospective users
// on the waitlist get in touch. See /admin/interest for the (admin-only) list.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = normalizeEmail(body.email);
    const role = body.role;

    if (!firstName || !lastName || !isEmail(email) || !isInterestRole(role)) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    await prisma.interestSubmission.create({
      data: { firstName, lastName, email, role },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
