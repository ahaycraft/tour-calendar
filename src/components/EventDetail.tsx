import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { buildItineraryMessage } from "@/lib/itinerary";
import ShowStatusBadge from "@/components/ShowStatusBadge";
import EventTypeBadge from "@/components/EventTypeBadge";
import EventTimeline from "@/components/EventTimeline";
import ShowAvailabilityControls from "@/components/ShowAvailabilityControls";
import ShowStatusControls from "@/components/ShowStatusControls";
import DeleteEventButton from "@/components/DeleteEventButton";
import VenueMap from "@/components/VenueMap";
import AddToCalendar from "@/components/AddToCalendar";
import TextItineraryButton from "@/components/TextItineraryButton";
import { geocodeVenue } from "@/lib/venues";
import { googleCalendarUrl } from "@/lib/calendar";
import {
  eventBasePath,
  eventHref,
  eventListLabel,
  eventNoun,
  type EventTypeStr
} from "@/lib/events";
import { canManage, isBandMember } from "@/lib/band";
import NeedsDetailsBadge, {
  needsDetails
} from "@/components/NeedsDetailsBadge";
import {
  ChevronLeft,
  MapPin,
  Clock,
  DollarSign,
  FileText,
  Pencil,
  Disc3,
  MessageCircle
} from "lucide-react";

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
        include: {
          user: { select: { id: true, name: true, phone: true } }
        },
        orderBy: { user: { name: "asc" } }
      }
    }
  });

  if (!show || !isBandMember(session!, show.bandId)) notFound();
  if (show.type !== expected) redirect(eventHref(show.type, show.id));

  const bandMembers = await prisma.bandMembership.findMany({
    where: { bandId: show.bandId },
    select: { user: { select: { id: true, phone: true } } }
  });
  const memberCount = bandMembers.length;

  const itineraryPhones = Array.from(
    new Set(
      bandMembers
        .filter((m) => m.user.id !== session!.user.id && m.user.phone)
        .map((m) => m.user.phone as string)
    )
  );

  const appUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? "";
  const itineraryMessage = buildItineraryMessage(show, appUrl);

  const myAvailability = show.availability.find(
    (a) => a.userId === session!.user.id
  );

  const availableMembers = show.availability.filter(
    (a) => a.status === "AVAILABLE"
  );
  const unavailableMembers = show.availability.filter(
    (a) => a.status === "UNAVAILABLE"
  );
  const pendingMembers = show.availability.filter(
    (a) => a.status === "PENDING"
  );

  const bandPhones = Array.from(
    new Set(
      show.availability
        .filter((a) => a.userId !== session!.user.id && a.user.phone)
        .map((a) => a.user.phone as string)
    )
  );

  const isAdminOrCreator = canManage(session!, show.bandId, show.createdById);

  const isRecording = show.type === "RECORDING";

  const icsUrl = `/api/shows/${show.id}/event.ics`;
  const googleUrl = googleCalendarUrl(show, appUrl);

  const savedCoords =
    show.venueLat != null && show.venueLng != null
      ? { lat: show.venueLat, lng: show.venueLng }
      : null;
  const geoCoords =
    savedCoords || (!show.venue && !show.city)
      ? null
      : await geocodeVenue(
          show.venue ?? "",
          show.city ?? "",
          show.state,
          show.country
        );
  const mapLat = savedCoords?.lat ?? geoCoords?.lat ?? null;
  const mapLng = savedCoords?.lng ?? geoCoords?.lng ?? null;

  return (
    <div>
      <Link
        href={eventBasePath(show.type)}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to {eventListLabel(show.type)}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] items-start">
        {/* One continuous card with internal dividers instead of three
            separately bordered boxes — reads as one detail screen with
            grouped sections rather than a stack of web-dashboard panels. */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 divide-y divide-zinc-800">
          <div className="p-6">
            <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold text-zinc-50">
                    {show.title}
                  </h1>
                  {show.type !== "SHOW" && <EventTypeBadge type={show.type} />}
                  <ShowStatusBadge status={show.status} />
                  {needsDetails(show) && <NeedsDetailsBadge />}
                </div>
                <p className="text-base sm:text-lg font-semibold text-zinc-200 mb-1">
                  {formatDate(show.date)}
                </p>
                <p className="text-zinc-500 text-sm">
                  Added by {show.createdBy.name}
                </p>
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
                <TextItineraryButton
                  phones={itineraryPhones}
                  message={itineraryMessage}
                />
                <AddToCalendar googleUrl={googleUrl} icsUrl={icsUrl} />
                {isAdminOrCreator && (
                  <Link
                    href={`${eventHref(show.type, show.id)}/edit`}
                    aria-label="Edit"
                    className="inline-flex h-9 w-9 items-center justify-center gap-1.5 rounded-full border border-zinc-700 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 sm:h-auto sm:w-auto sm:rounded-lg sm:px-3 sm:py-1.5"
                  >
                    <Pencil size={14} />
                    <span className="hidden sm:inline">Edit</span>
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
                      show.venue || show.city ? show.country : null
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

              {(show.loadInTime || show.doorsTime || show.setTime) && (
                <div className="flex gap-2">
                  <Clock size={15} className="text-transparent shrink-0" />
                  <EventTimeline
                    date={show.date}
                    loadInTime={show.loadInTime}
                    doorsTime={show.doorsTime}
                    setTime={show.setTime}
                    isRecording={isRecording}
                  />
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
                  <FileText
                    size={15}
                    className="text-zinc-500 shrink-0 mt-0.5"
                  />
                  <span className="whitespace-pre-wrap text-zinc-400">
                    {show.notes}
                  </span>
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
              />
            )}
          </div>

          {/* My Availability */}
          <div className="p-6">
            <h2 className="font-semibold text-zinc-100 mb-3">
              My Availability
            </h2>
            <ShowAvailabilityControls
              key={show.id}
              showId={show.id}
              currentStatus={myAvailability?.status ?? "PENDING"}
              currentNote={myAvailability?.note ?? ""}
            />
          </div>

          {/* Band Member Availability */}
          <div className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold text-zinc-100">
                Group Availability
                <span className="text-sm font-normal text-zinc-500 ml-2">
                  {availableMembers.length} available
                </span>
              </h2>
              {bandPhones.length > 0 && (
                <a
                  href={`sms:${bandPhones.join(",")}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 shrink-0"
                >
                  <MessageCircle size={14} />
                  Text group
                </a>
              )}
            </div>

            {show.availability.length === 0 ? (
              <p className="text-sm text-zinc-500">No responses yet.</p>
            ) : (
              <div className="space-y-4">
                {availableMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-2">
                      Available
                    </p>
                    <div className="space-y-1">
                      {availableMembers.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-zinc-300">
                            {a.user.name}
                          </span>
                          {a.note && (
                            <span className="text-xs text-zinc-500">
                              {a.note}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {unavailableMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-2">
                      Unavailable
                    </p>
                    <div className="space-y-1">
                      {unavailableMembers.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="text-sm text-zinc-300">
                            {a.user.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {a.note && (
                              <span className="text-xs text-zinc-500">
                                {a.note}
                              </span>
                            )}
                            {a.user.phone && (
                              <a
                                href={`sms:${a.user.phone}`}
                                aria-label={`Text ${a.user.name}`}
                                className="text-zinc-500 hover:text-blue-400"
                              >
                                <MessageCircle size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-2">
                      No Response
                    </p>
                    <div className="space-y-1">
                      {pendingMembers.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="text-sm text-zinc-500">
                            {a.user.name}
                          </span>
                          {a.user.phone && (
                            <a
                              href={`sms:${a.user.phone}`}
                              aria-label={`Text ${a.user.name}`}
                              className="text-zinc-500 hover:text-blue-400"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
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

      {isAdminOrCreator && (
        <DeleteEventButton
          showId={show.id}
          noun={eventNoun(show.type)}
          basePath={eventBasePath(show.type)}
        />
      )}
    </div>
  );
}
