import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("password123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@band.com" },
    update: {},
    create: {
      name: "Band Admin",
      email: "admin@band.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Create member users
  const memberPassword = await bcrypt.hash("password123", 12);
  const member1 = await prisma.user.upsert({
    where: { email: "guitarist@band.com" },
    update: {},
    create: {
      name: "Alex (Guitar)",
      email: "guitarist@band.com",
      password: memberPassword,
    },
  });

  const member2 = await prisma.user.upsert({
    where: { email: "drummer@band.com" },
    update: {},
    create: {
      name: "Sam (Drums)",
      email: "drummer@band.com",
      password: memberPassword,
    },
  });

  // Create some shows
  const show1 = await prisma.show.upsert({
    where: { id: "seed-show-1" },
    update: {},
    create: {
      id: "seed-show-1",
      title: "The Roxy",
      venue: "The Roxy Theatre",
      city: "Los Angeles",
      state: "CA",
      country: "US",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      doorsTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000),
      setTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000),
      guarantee: 500,
      status: "CONFIRMED",
      createdById: admin.id,
    },
  });

  await prisma.show.upsert({
    where: { id: "seed-show-2" },
    update: {},
    create: {
      id: "seed-show-2",
      title: "Bottom of the Hill",
      venue: "Bottom of the Hill",
      city: "San Francisco",
      state: "CA",
      country: "US",
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
      guarantee: 300,
      status: "PENDING",
      notes: "Need to confirm PA system availability",
      createdById: admin.id,
    },
  });

  // Add availability responses
  await prisma.showAvailability.upsert({
    where: { userId_showId: { userId: member1.id, showId: show1.id } },
    update: {},
    create: {
      userId: member1.id,
      showId: show1.id,
      status: "AVAILABLE",
    },
  });

  await prisma.showAvailability.upsert({
    where: { userId_showId: { userId: member2.id, showId: show1.id } },
    update: {},
    create: {
      userId: member2.id,
      showId: show1.id,
      status: "PENDING",
    },
  });

  console.log("✓ Seeded successfully!");
  console.log("  Admin: admin@band.com / password123");
  console.log("  Members: guitarist@band.com, drummer@band.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
