import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Band-only app: keep people signed in for a year (default is 30 days).
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 365 },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token) return session;
      session.user.id = token.id as string;
      session.user.role = token.role as string;

      // Read memberships fresh every time so creating a band, switching,
      // accepting an invite, or a role change all take effect immediately —
      // no stale JWT copy to refresh.
      const memberships = await prisma.bandMembership.findMany({
        where: { userId: token.id as string },
        include: { band: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: "asc" },
      });
      session.user.bands = memberships.map((m) => ({
        id: m.band.id,
        name: m.band.name,
        slug: m.band.slug,
        role: m.role,
      }));

      return session;
    },
  },
});
