import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import ShowStatusBadge from "@/components/ShowStatusBadge";
import EventTypeBadge from "@/components/EventTypeBadge";
import AvailabilityBadge from "@/components/AvailabilityBadge";
import ShowAvailabilityControls from "@/components/ShowAvailabilityControls";
import ShowStatusControls from "@/components/ShowStatusControls";
import VenueMap from "@/components/VenueMap";
import AddToCalendar from "@/components/AddToCalendar";
import { geocodeVenue } from "@/lib/venues";
import { googleCalendarUrl } from "@/lib/calendar";
import {
  eventBasePath,
  eventHref,
  eventListLabel,
  eventNoun,
  type EventTypeStr,
} from "@/lib/events";
import { canManage, isBandMember } from "@/lib/band";
import NeedsDetailsBadge, { needsDetails } from "@/components/NeedsDetailsBadge";
import { ChevronLeft, MapPin, Clock, DollarSign, FileText, Pencil, Disc3 } from "lucide-react";

interface Props {
  id: string;
  /** Which route rendered this; a mismatched event is redirected to its own route. */
  expected: EventTypeStr;
}

export default async function EventDetail({ id, expected }: Props) {
  const session = await auth();

  const show = await prisma.show.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      release: { select: { id: true, title: true } },
      availability: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!show || !isBandMember(session!, show.bandId)) notFound();
  if (show.type !== expected) redirect(eventHref(show.type, show.id));

  const memberCount = await prisma.bandMembership.count({
    where: { bandId: show.bandId },
  });

  const myAvailability = show.availability.find(
    (a) => a.userId === session!.user.id
  );

  const availableMembers = show.availability.filter((a) => a.status === "AVAILABLE");
  const unavailableMembers = show.availability.filter((a) => a.status === "UNAVAILABLE");
  const pendingMembers = show.availability.filter((a) => a.status === "PENDING");

  const isAdminOrCreator = canManage(session!, show.bandId, show.createdById);

  const isRecording = show.type === "RECORDING";

  const appUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? "";
  const icsUrl = `/api/shows/${show.id}/event.ics`;
  const googleUrl = googleCalendarUrl(show, appUrl);

  const savedCoords =
    show.venueLat != null && show.venueLng != null
      ? { lat: show.venueLat, lng: show.venueLng }
      : null;
  const geoCoords =
    savedCoords || (!show.venue && !show.city)
      ? null
      : await geocodeVenue(show.venue ?? "", show.city ?? "", show.state, show.country);
  const mapLat = savedCoords?.lat ?? geoCoords?.lat ?? null;
  const mapLng = savedCoords?.lng ?? geoCoords?.lng ?? null;

  return (
    <div className="max-w-5xl">
      <Link
        href={eventBasePath(show.type)}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to {eventListLabel(show.type)}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold text-zinc-50">{show.title}</h1>
                  {show.type !== "SHOW" && <EventTypeBadge type={show.type} />}
                  <ShowStatusBadge status={show.status} />
                  {needsDetails(show) && <NeedsDetailsBadge />}
                </div>
                <p className="text-zinc-500 text-sm">Added by {show.createdBy.name}</p>
                {show.release && (
                  <Link
                    href={`/releases/${show.release.id}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-blue-400 transition-colors"
                  >
                    <Disc3 size={14} className="shrink-0" />
                    Tracking for {show.release.title}
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <AddToCalendar googleUrl={googleUrl} icsUrl={icsUrl} />
                {isAdminOrCreator && (
                  <Link
                    href={`${eventHref(show.type, show.id)}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 font-medium transition-colors"
                  >
                    <Pencil size={14} />
                    Edit
                  </Link>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-zinc-300">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-zinc-500 shrink-0 mt-0.5" />
                <div>
                  <div>
                    {[
                      show.venue,
                      show.city,
                      show.state,
                      show.venue || show.city ? show.country : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || (
                      <span className="text-zinc-500">
                        Venue and city not set yet
                      </span>
                    )}
                  </div>
                  {show.venueAddress && (
                    <div className="text-zinc-500">{show.venueAddress}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock size={15} className="text-zinc-500 shrink-0" />
                <span>{formatDate(show.date)}</span>
              </div>

              {(show.loadInTime || show.doorsTime || show.setTime) && (
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-transparent shrink-0" />
                  <div className="flex gap-4 text-zinc-400">
                    {show.loadInTime && (
                      <span>
                        {isRecording ? "Call" : "Load in"}: {formatTime(show.loadInTime)}
                      </span>
                    )}
                    {show.doorsTime && <span>Doors: {formatTime(show.doorsTime)}</span>}
                    {show.setTime && (
                      <span>
                        {isRecording ? "Wrap" : "Set"}: {formatTime(show.setTime)}
                      </span>
                    )}
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
              <ShowStatusControls
                showId={show.id}
                currentStatus={show.status}
                availableCount={availableMembers.length}
                memberCount={memberCount}
                noun={eventNoun(show.type)}
                basePath={eventBasePath(show.type)}
              />
            )}
          </div>

          {/* My Availability */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
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

        <div className="lg:sticky lg:top-20">
          <VenueMap
            lat={mapLat}
            lng={mapLng}
            label={show.venue ?? show.city ?? show.title}
            address={show.venueAddress}
            approximate={!savedCoords && mapLat != null}
          />
        </div>
      </div>
    </div>
  );
}
