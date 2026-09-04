import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { appleSplashScreens } from "@/lib/apple-splash-screens";
import { SplashScreen } from "@/components/SplashScreen";
import "./globals.css";

// Runs before #app-splash is parsed: when the app is a normal browser tab
// (not an installed/standalone PWA) it flags <html> so globals.css hides the
// launch overlay outright. iOS Safari exposes navigator.standalone; every other
// platform reports the standalone display-mode. There is no server-side signal
// for this, so it has to be a pre-paint inline script.
const SPLASH_GUARD = `(function(){try{if(!matchMedia('(display-mode: standalone)').matches&&!navigator.standalone)document.documentElement.classList.add('no-splash')}catch(e){document.documentElement.classList.add('no-splash')}})()`;

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
// the server, and rendered into <html data-theme> directly — no theme flash and
// no hydration mismatch to suppress. ThemeMenu writes the
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
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: SPLASH_GUARD }} />
        <div id="app-splash" aria-hidden="true">
          <span className="app-splash-mark" />
        </div>
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
