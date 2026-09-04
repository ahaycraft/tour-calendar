import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { appleSplashScreens } from "@/lib/apple-splash-screens";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Woodshed",
  description: "Band calendar, availability, songwriting, and release planning",
  appleWebApp: {
    capable: true,
    title: "Woodshed",
    statusBarStyle: "black-translucent",
    startupImage: appleSplashScreens,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// The appearance choice lives in the `theme` cookie so it can be read here, on
// the server, and rendered into <html data-theme> directly — no pre-paint
// script, no flash, no hydration mismatch to suppress. ThemeMenu writes the
// cookie (and updates <html> in place) when the user picks. The app is dark by
// default; only an explicit "light" overrides.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme =
    (await cookies()).get("theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
