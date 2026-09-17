import { z } from "zod";

// Vars a real feature depends on — missing one of these should fail the
// server loudly at boot, not leave that feature silently broken for
// whoever hits it first in production. (This is exactly what happened
// with NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: set locally, never added to
// Vercel's Production environment, so the venue map just threw in the
// browser console until someone noticed.)
//
// Vars with a real fallback at their call site are deliberately excluded:
// GOOGLE_PLACES_API_KEY (falls back to the free Photon geocoder, see
// venues.ts), WEB_PUSH_CONTACT (falls back to a placeholder contact, see
// push.ts), CRON_SECRET (its own comment in .env says unset disables that
// endpoint on purpose), and AUTH_URL (a local-dev-only override).
const schema = z
  .object({
    DATABASE_URL: z.string().min(1, "required for Prisma to connect"),
    AUTH_SECRET: z.string().min(1).optional(),
    NEXTAUTH_SECRET: z.string().min(1).optional(),
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z
      .string()
      .min(1, "required by VenueMap.tsx"),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, "required for web push"),
    VAPID_PUBLIC_KEY: z.string().min(1, "required for web push"),
    VAPID_PRIVATE_KEY: z.string().min(1, "required for web push")
  })
  .refine((env) => env.AUTH_SECRET || env.NEXTAUTH_SECRET, {
    message: "AUTH_SECRET (or the legacy NEXTAUTH_SECRET) is required"
  });

/** Called once from instrumentation.ts's `register()` — see that file. */
export function validateEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid or missing environment variables:\n${issues}`);
  }
}
