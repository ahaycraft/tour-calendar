"use server";

import { revalidatePath } from "next/cache";

/**
 * Re-render the protected shell (the `(protected)` layout and everything under
 * it). Client mutations that go through Route Handlers can't touch the shared
 * layout with `router.refresh()` alone, so anything that changes the
 * "needs response" count in the nav calls this afterwards.
 */
export async function revalidateShell(): Promise<void> {
  revalidatePath("/", "layout");
}
