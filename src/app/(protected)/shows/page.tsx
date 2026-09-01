import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import ShowStatusBadge from "@/components/ShowStatusBadge";
import AvailabilityBadge from "@/components/AvailabilityBadge";

export default async function ShowsPage() {
  const session = await auth();

  const shows = await prisma.show.findMany({
    orderBy: { date: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      availability: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  const upcoming = shows.filter((s) => new Date(s.date) >= new Date() && s.status !== "CANCELLED");
  const past = shows.filter((s) => new Date(s.date) < new Date() || s.status === "CANCELLED");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Shows</h1>
        <Link
          href="/shows/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors text-sm"
        >
          + Add Show
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-zinc-400 mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-zinc-500 text-sm">No upcoming shows. Add one!</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((show) => {
              const myAvail = show.availability.find(
                (a) => a.userId === session!.user.id
              );
              const availCount = show.availability.filter(
                (a) => a.status === "AVAILABLE"
              ).length;

              return (
                <Link
                  key={show.id}
                  href={`/shows/${show.id}`}
                  className="block bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-100">{show.title}</span>
                        <ShowStatusBadge status={show.status} />
                      </div>
                      <p className="text-sm text-zinc-400 mt-0.5">
                        {show.venue} · {show.city}{show.state ? `, ${show.state}` : ""}
                      </p>
                      <p className="text-sm text-zinc-500 mt-0.5">{formatDate(show.date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <AvailabilityBadge status={myAvail?.status ?? "PENDING"} />
                      <span className="text-xs text-zinc-500">
                        {availCount} available
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-600 mb-3">Past / Cancelled</h2>
          <div className="space-y-3 opacity-50">
            {past.map((show) => (
              <Link
                key={show.id}
                href={`/shows/${show.id}`}
                className="block bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-300">{show.title}</span>
                      <ShowStatusBadge status={show.status} />
                    </div>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {show.venue} · {show.city}{show.state ? `, ${show.state}` : ""}
                    </p>
                    <p className="text-sm text-zinc-600 mt-0.5">{formatDate(show.date)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
