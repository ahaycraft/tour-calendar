import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";

const MAX_EVENTS = 90;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type, name, dates, city, state, country } = await request.json();

    if (type !== undefined && type !== "SHOW" && type !== "RECORDING") {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "A name is required" }, { status: 400 });
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "Pick at least one date" }, { status: 400 });
    }
    if (dates.length > MAX_EVENTS) {
      return NextResponse.json(
        { error: `Too many dates — ${MAX_EVENTS} max per batch` },
        { status: 400 }
      );
    }
    if (!dates.every((d: unknown) => typeof d === "string" && DATE_RE.test(d))) {
      return NextResponse.json({ error: "Invalid date in range" }, { status: 400 });
    }

    const bandId = await getActiveBandId(session);
    if (!bandId) {
      return NextResponse.json({ error: "No band selected" }, { status: 400 });
    }

    const sorted = [...new Set(dates as string[])].sort();
    const label = name.trim();

    const created = await prisma.show.createManyAndReturn({
      data: sorted.map((d, i) => ({
        bandId,
        type: type ?? "SHOW",
        title: `${label} — Day ${i + 1}`,
        venue: null,
        city: city || null,
        state: state || null,
        country: country || "US",
        date: new Date(`${d}T00:00:00`),
        createdById: session.user.id,
      })),
      select: { id: true },
    });

    return NextResponse.json(
      { count: created.length, ids: created.map((s) => s.id) },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
