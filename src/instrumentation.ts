// Runs once when a server instance boots, and must finish before it starts
// handling requests — see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation.
// Used here to fail fast on missing required env vars instead of letting a
// dependent feature quietly break in production.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env");
    validateEnv();
  }
}
