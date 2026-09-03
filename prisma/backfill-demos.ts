import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-off: copy each song's legacy `samplyUrl` into a SongDemo row so existing
 * track links show up in the new Demos list. Safe to run more than once — songs
 * that already have a demo are skipped. Run with: npx tsx prisma/backfill-demos.ts
 */
async function main() {
  const songs = await prisma.song.findMany({
    where: { samplyUrl: { not: null } },
    select: { id: true, samplyUrl: true, createdById: true, _count: { select: { demos: true } } },
  });

  let created = 0;
  for (const song of songs) {
    const url = song.samplyUrl?.trim();
    if (!url || song._count.demos > 0) continue;
    await prisma.songDemo.create({
      data: {
        songId: song.id,
        url,
        label: "Original link",
        createdById: song.createdById,
      },
    });
    created++;
  }

  console.log(`Backfilled ${created} demo(s) from ${songs.length} song(s) with a legacy link.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
