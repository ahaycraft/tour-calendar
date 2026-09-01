import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import ShowStatusBadge from "@/components/ShowStatusBadge";
import AvailabilityBadge from "@/components/AvailabilityBadge";
import ShowAvailabilityControls from "@/components/ShowAvailabilityControls";
import ShowStatusControls from "@/components/ShowStatusControls";
import { ChevronLeft, MapPin, Clock, DollarSign, FileText } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShowDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const show = await prisma.show.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      availability: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!show) notFound();

  const myAvailability = show.availability.find(
    (a) => a.userId === session!.user.id
  );

  const availableMembers = show.availability.filter((a) => a.status === "AVAILABLE");
  const unavailableMembers = show.availability.filter((a) => a.status === "UNAVAILABLE");
  const pendingMembers = show.availability.filter((a) => a.status === "PENDING");

  const isAdminOrCreator =
    session!.user.role === "ADMIN" || show.createdById === session!.user.id;

  return (
    <div className="max-w-2xl">
      <Link
        href="/shows"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Shows
      </Link>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-zinc-50">{show.title}</h1>
              <ShowStatusBadge status={show.status} />
            </div>
            <p className="text-zinc-500 text-sm">Added by {show.createdBy.name}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-zinc-300">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-zinc-500 shrink-0" />
            <span>
              {show.venue}, {show.city}{show.state ? `, ${show.state}` : ""}, {show.country}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={15} className="text-zinc-500 shrink-0" />
            <span>{formatDate(show.date)}</span>
          </div>

          {(show.loadInTime || show.doorsTime || show.setTime) && (
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-transparent shrink-0" />
              <div className="flex gap-4 text-zinc-400">
                {show.loadInTime && <span>Load in: {formatTime(show.loadInTime)}</span>}
                {show.doorsTime && <span>Doors: {formatTime(show.doorsTime)}</span>}
                {show.setTime && <span>Set: {formatTime(show.setTime)}</span>}
              </div>
            </div>
          )}

          {show.guarantee && (
            <div className="flex items-center gap-2">
              <DollarSign size={15} className="text-zinc-500 shrink-0" />
              <span>${show.guarantee.toFixed(0)} guarantee</span>
            </div>
          )}

          {show.notes && (
            <div className="flex items-start gap-2">
              <FileText size={15} className="text-zinc-500 shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap text-zinc-400">{show.notes}</span>
            </div>
          )}
        </div>

        {isAdminOrCreator && (
          <ShowStatusControls showId={show.id} currentStatus={show.status} />
        )}
      </div>

      {/* My Availability */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
        <h2 className="font-semibold text-zinc-100 mb-3">My Availability</h2>
        <div className="flex items-center gap-3 mb-4">
          <AvailabilityBadge status={myAvailability?.status ?? "PENDING"} />
          {myAvailability?.note && (
            <span className="text-sm text-zinc-500">{myAvailability.note}</span>
          )}
        </div>
        <ShowAvailabilityControls
          showId={show.id}
          currentStatus={myAvailability?.status ?? "PENDING"}
          currentNote={myAvailability?.note ?? ""}
        />
      </div>

      {/* Band Member Availability */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <h2 className="font-semibold text-zinc-100 mb-4">
          Band Availability
          <span className="text-sm font-normal text-zinc-500 ml-2">
            {availableMembers.length} available
          </span>
        </h2>

        {show.availability.length === 0 ? (
          <p className="text-sm text-zinc-500">No responses yet.</p>
        ) : (
          <div className="space-y-4">
            {availableMembers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-2">Available</p>
                <div className="space-y-1">
                  {availableMembers.map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">{a.user.name}</span>
                      {a.note && <span className="text-xs text-zinc-500">{a.note}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unavailableMembers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-2">Unavailable</p>
                <div className="space-y-1">
                  {unavailableMembers.map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">{a.user.name}</span>
                      {a.note && <span className="text-xs text-zinc-500">{a.note}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingMembers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-2">No Response</p>
                <div className="space-y-1">
                  {pendingMembers.map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">{a.user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
