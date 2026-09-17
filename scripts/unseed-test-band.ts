// Removes everything scripts/seed-test-band.ts created. Deleting the Band
// row cascades away every Show, Song, Release, Instrument, and their
// children (ReleaseTrack, SongSection, SongComment, ShowAvailability, etc.)
// automatically. The 3 fake users aren't owned by the band relationship-wise,
// so they're deleted explicitly by their fixed seed emails. Your real
// account (the band's OWNER) is never touched — only its membership in this
// one test band goes away, which the band's own deletion already covers.
//
// Usage:
//   DATABASE_URL="<target db>" npx tsx scripts/unseed-test-band.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BAND_SLUG = "test-band-seed";
const FAKE_MEMBER_EMAILS = [
  "jamie.rivera@seed.woodshedd.test",
  "chris.okafor@seed.woodshedd.test",
  "morgan.lee@seed.woodshedd.test"
];

async function main() {
  const band = await prisma.band.findUnique({ where: { slug: BAND_SLUG } });
  if (band) {
    await prisma.band.delete({ where: { id: band.id } });
    console.log(`✓ Deleted band "${band.name}" (${band.id}) and everything in it`);
  } else {
    console.log(`No band with slug "${BAND_SLUG}" found — already clean.`);
  }

  const { count } = await prisma.user.deleteMany({
    where: { email: { in: FAKE_MEMBER_EMAILS } }
  });
  console.log(`✓ Deleted ${count} test member account(s)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
