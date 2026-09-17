// One-off seed script for a fully isolated test band, so the mobile app has
// enough real-looking data to test/screenshot against without touching any
// real band's shows, songs, or releases.
//
// Isolation: every row this creates hangs off ONE Band (slug BAND_SLUG). Show,
// Song, Release, and Instrument all `onDelete: Cascade` off Band, so deleting
// that single row (see unseed-test-band.ts) removes everything this script
// added except the 3 fake User rows, which that script also removes by their
// fixed emails below. It never updates or deletes anything outside this band.
//
// Idempotent: every row uses a fixed, hardcoded id (not a random cuid), and
// every create is an `upsert`, so running this twice never duplicates data —
// it just re-confirms the same rows exist.
//
// Usage:
//   DATABASE_URL="<target db>" npx tsx scripts/seed-test-band.ts
// (omit DATABASE_URL to use whatever's in .env — the Neon "dev" branch)

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BAND_SLUG = "test-band-seed";
const BAND_ID = "seedtb-band";
const OWNER_EMAIL = "aahaycraft@gmail.com";
const TEST_PASSWORD = "TestBand123!";

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);

// Real venues, so the venue map has actual coordinates to render.
const VENUES = {
  fillmore: {
    venue: "The Fillmore",
    city: "San Francisco",
    state: "CA",
    venueAddress: "1805 Geary Blvd, San Francisco, CA 94115",
    venueLat: 37.784,
    venueLng: -122.433
  },
  redRocks: {
    venue: "Red Rocks Amphitheatre",
    city: "Morrison",
    state: "CO",
    venueAddress: "18300 W Alameda Pkwy, Morrison, CO 80465",
    venueLat: 39.6654,
    venueLng: -105.2057
  },
  bluebird: {
    venue: "The Bluebird Theater",
    city: "Denver",
    state: "CO",
    venueAddress: "3317 E Colfax Ave, Denver, CO 80206",
    venueLat: 39.7398,
    venueLng: -104.9647
  },
  emptyBottle: {
    venue: "Empty Bottle",
    city: "Chicago",
    state: "IL",
    venueAddress: "1035 N Western Ave, Chicago, IL 60622",
    venueLat: 41.9002,
    venueLng: -87.6875
  },
  sinclair: {
    venue: "The Sinclair",
    city: "Cambridge",
    state: "MA",
    venueAddress: "52 Church St, Cambridge, MA 02138",
    venueLat: 42.3736,
    venueLng: -71.119
  }
} as const;

async function main() {
  console.log(`Seeding test band ("${BAND_SLUG}")...`);

  // --- Band + members ------------------------------------------------------

  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) {
    throw new Error(
      `No user with email ${OWNER_EMAIL} — check the email or create that account first.`
    );
  }

  const testPasswordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const fakeMembers = [
    { id: "seedtb-user-jamie", name: "Jamie Rivera", email: "jamie.rivera@seed.woodshedd.test" },
    { id: "seedtb-user-chris", name: "Chris Okafor", email: "chris.okafor@seed.woodshedd.test" },
    { id: "seedtb-user-morgan", name: "Morgan Lee", email: "morgan.lee@seed.woodshedd.test" }
  ];
  for (const m of fakeMembers) {
    await prisma.user.upsert({
      where: { id: m.id },
      update: {},
      create: { id: m.id, name: m.name, email: m.email, password: testPasswordHash }
    });
  }

  const band = await prisma.band.upsert({
    where: { id: BAND_ID },
    update: {},
    create: { id: BAND_ID, name: "Nightshade Radio", slug: BAND_SLUG }
  });

  const allMemberIds = [owner.id, ...fakeMembers.map((m) => m.id)];
  for (const [userId, role] of [
    [owner.id, "OWNER"],
    [fakeMembers[0].id, "MEMBER"],
    [fakeMembers[1].id, "MEMBER"],
    [fakeMembers[2].id, "MEMBER"]
  ] as const) {
    await prisma.bandMembership.upsert({
      where: { bandId_userId: { bandId: band.id, userId } },
      update: {},
      create: { bandId: band.id, userId, role }
    });
  }

  // --- Songs -----------------------------------------------------------------

  const album1Songs = [
    "Static and Salt",
    "Low Tide",
    "Copper Wire",
    "Empty Booth",
    "Radio Silence",
    "Neon Bruise",
    "Gravel Road",
    "Borrowed Time",
    "Paper Moon Again",
    "Last Call, First Light"
  ].map((title) => ({ title, status: "RELEASED" as const }));

  const album2Songs = [
    { title: "Halfway to Nowhere", status: "TRACKED" as const },
    { title: "Rust Belt Lullaby", status: "TRACKED" as const },
    { title: "Cheap Motel Sunrise", status: "READY_TO_TRACK" as const },
    { title: "Wire and Bone", status: "READY_TO_TRACK" as const },
    { title: "Slow Burn Out", status: "DEMO" as const },
    { title: "Broken Compass", status: "DEMO" as const },
    { title: "Fault Lines", status: "WRITING" as const },
    { title: "Ghost in the Van", status: "WRITING" as const },
    { title: "Amber Light", status: "IDEA" as const },
    { title: "New Idea (working title)", status: "IDEA" as const }
  ];

  const songs: { id: string; title: string; status: string }[] = [];
  [...album1Songs, ...album2Songs].forEach((s, i) => {
    songs.push({ id: `seedtb-song-${i + 1}`, ...s });
  });

  for (const [i, s] of songs.entries()) {
    const createdBy = allMemberIds[i % allMemberIds.length];
    await prisma.song.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        bandId: band.id,
        title: s.title,
        status: s.status as never,
        key: ["E", "A", "G", "D", "C"][i % 5],
        tempo: 90 + ((i * 7) % 60),
        timeSig: i % 6 === 0 ? "6/8" : "4/4",
        createdById: createdBy
      }
    });
  }

  // Arrangement sections on the two title tracks, for realism.
  for (const songId of ["seedtb-song-1", "seedtb-song-11"]) {
    const sections = ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Outro"];
    for (const [i, name] of sections.entries()) {
      await prisma.songSection.upsert({
        where: { id: `${songId}-section-${i + 1}` },
        update: {},
        create: { id: `${songId}-section-${i + 1}`, songId, name, position: i }
      });
    }
  }

  // A comment thread on an in-progress song.
  await prisma.songComment.upsert({
    where: { id: "seedtb-comment-1" },
    update: {},
    create: {
      id: "seedtb-comment-1",
      songId: "seedtb-song-17",
      userId: fakeMembers[1].id,
      body: "Chorus feels a half-step too high for me — can we try it in D?"
    }
  });
  await prisma.songComment.upsert({
    where: { id: "seedtb-comment-2" },
    update: {},
    create: {
      id: "seedtb-comment-2",
      songId: "seedtb-song-17",
      userId: owner.id,
      body: "Good call, let's try it Thursday at practice."
    }
  });

  // --- Releases ----------------------------------------------------------

  const release1 = await prisma.release.upsert({
    where: { id: "seedtb-release-1" },
    update: {},
    create: {
      id: "seedtb-release-1",
      bandId: band.id,
      title: "Static and Salt",
      kind: "ALBUM",
      status: "RELEASED",
      targetDate: inDays(-240),
      createdById: owner.id
    }
  });
  const release2 = await prisma.release.upsert({
    where: { id: "seedtb-release-2" },
    update: {},
    create: {
      id: "seedtb-release-2",
      bandId: band.id,
      title: "Halfway to Nowhere",
      kind: "ALBUM",
      status: "TRACKING",
      targetDate: inDays(120),
      createdById: owner.id
    }
  });

  for (const [i, s] of songs.slice(0, 10).entries()) {
    await prisma.releaseTrack.upsert({
      where: { releaseId_songId: { releaseId: release1.id, songId: s.id } },
      update: {},
      create: { id: `seedtb-track-1-${i + 1}`, releaseId: release1.id, songId: s.id, position: i }
    });
  }
  for (const [i, s] of songs.slice(10, 20).entries()) {
    await prisma.releaseTrack.upsert({
      where: { releaseId_songId: { releaseId: release2.id, songId: s.id } },
      update: {},
      create: { id: `seedtb-track-2-${i + 1}`, releaseId: release2.id, songId: s.id, position: i }
    });
  }

  // --- Shows, recordings, practices ---------------------------------------

  type ShowSeed = {
    id: string;
    type: "SHOW" | "RECORDING" | "PRACTICE";
    title: string;
    dayOffset: number;
    status: "CONFIRMED" | "PENDING" | "CANCELLED";
    venue?: (typeof VENUES)[keyof typeof VENUES];
    releaseId?: string;
    tourGroupId?: string;
    tourName?: string;
    guarantee?: number;
  };

  const showSeeds: ShowSeed[] = [
    // Past shows
    { id: "seedtb-show-1", type: "SHOW", title: "The Fillmore", dayOffset: -60, status: "CONFIRMED", venue: VENUES.fillmore, guarantee: 800 },
    { id: "seedtb-show-2", type: "SHOW", title: "Empty Bottle", dayOffset: -30, status: "CONFIRMED", venue: VENUES.emptyBottle, guarantee: 400 },
    { id: "seedtb-show-3", type: "SHOW", title: "The Sinclair", dayOffset: -14, status: "CANCELLED", venue: VENUES.sinclair, guarantee: 500 },
    // Upcoming standalone shows
    { id: "seedtb-show-4", type: "SHOW", title: "The Bluebird Theater", dayOffset: 21, status: "CONFIRMED", venue: VENUES.bluebird, guarantee: 600 },
    { id: "seedtb-show-5", type: "SHOW", title: "TBD — awaiting contract", dayOffset: 45, status: "PENDING" },
    // A 3-day "Fall Tour" block
    { id: "seedtb-show-6", type: "SHOW", title: "Red Rocks Amphitheatre", dayOffset: 70, status: "CONFIRMED", venue: VENUES.redRocks, tourGroupId: "seedtb-fall-tour", tourName: "Fall Tour", guarantee: 1200 },
    { id: "seedtb-show-7", type: "SHOW", title: "The Bluebird Theater (2nd night)", dayOffset: 71, status: "CONFIRMED", venue: VENUES.bluebird, tourGroupId: "seedtb-fall-tour", tourName: "Fall Tour", guarantee: 700 },
    { id: "seedtb-show-8", type: "SHOW", title: "Empty Bottle (return)", dayOffset: 73, status: "PENDING", venue: VENUES.emptyBottle, tourGroupId: "seedtb-fall-tour", tourName: "Fall Tour", guarantee: 450 },
    // Recording sessions, tied to the in-progress album
    { id: "seedtb-show-9", type: "RECORDING", title: "Tracking drums + bass", dayOffset: 10, status: "CONFIRMED", releaseId: release2.id },
    { id: "seedtb-show-10", type: "RECORDING", title: "Tracking guitars", dayOffset: 17, status: "CONFIRMED", releaseId: release2.id },
    { id: "seedtb-show-11", type: "RECORDING", title: "Vocals", dayOffset: 24, status: "PENDING", releaseId: release2.id },
    { id: "seedtb-show-12", type: "RECORDING", title: "Mix review", dayOffset: 40, status: "PENDING", releaseId: release2.id },
    // Practices — past and upcoming
    { id: "seedtb-show-13", type: "PRACTICE", title: "Weekly practice", dayOffset: -7, status: "CONFIRMED" },
    { id: "seedtb-show-14", type: "PRACTICE", title: "Weekly practice", dayOffset: -1, status: "CONFIRMED" },
    { id: "seedtb-show-15", type: "PRACTICE", title: "Weekly practice", dayOffset: 6, status: "CONFIRMED" },
    { id: "seedtb-show-16", type: "PRACTICE", title: "Weekly practice", dayOffset: 13, status: "CONFIRMED" },
    { id: "seedtb-show-17", type: "PRACTICE", title: "Pre-tour run-through", dayOffset: 68, status: "CONFIRMED" },
    { id: "seedtb-show-18", type: "PRACTICE", title: "New song workshop", dayOffset: 4, status: "PENDING" }
  ];

  for (const s of showSeeds) {
    const date = inDays(s.dayOffset);
    await prisma.show.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        bandId: band.id,
        type: s.type,
        title: s.title,
        date,
        setTime: s.type === "SHOW" ? new Date(date.getTime() + 21 * 60 * 60 * 1000) : undefined,
        doorsTime: s.type === "SHOW" ? new Date(date.getTime() + 19 * 60 * 60 * 1000) : undefined,
        status: s.status,
        guarantee: s.guarantee,
        venue: s.venue?.venue,
        city: s.venue?.city,
        state: s.venue?.state,
        venueAddress: s.venue?.venueAddress,
        venueLat: s.venue?.venueLat,
        venueLng: s.venue?.venueLng,
        releaseId: s.releaseId,
        tourGroupId: s.tourGroupId,
        tourName: s.tourName,
        createdById: owner.id
      }
    });
  }

  // Availability responses from all 4 members on every future event.
  const availabilityStatuses = ["AVAILABLE", "UNAVAILABLE", "PENDING"] as const;
  const futureShows = showSeeds.filter((s) => s.dayOffset > 0);
  for (const [si, s] of futureShows.entries()) {
    for (const [mi, userId] of allMemberIds.entries()) {
      await prisma.showAvailability.upsert({
        where: { userId_showId: { userId, showId: s.id } },
        update: {},
        create: {
          userId,
          showId: s.id,
          status: availabilityStatuses[(si + mi) % availabilityStatuses.length]
        }
      });
    }
  }

  console.log("✓ Seeded successfully!");
  console.log(`  Band: Nightshade Radio (slug: ${BAND_SLUG})`);
  console.log(`  Owner: ${OWNER_EMAIL} (your existing account)`);
  console.log(`  Test members (password: ${TEST_PASSWORD}):`);
  for (const m of fakeMembers) console.log(`    ${m.name} — ${m.email}`);
  console.log(`  ${songs.length} songs across 2 albums, ${showSeeds.length} calendar events`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
