"use client";

import { useState } from "react";

export const DEFAULT_PAGE_SIZE = 10;

/** Slices `items` into the given 1-indexed page, clamping `page` to a valid
 *  range so an out-of-bounds page (e.g. after a filter shrinks the list)
 *  never strands you on a now-empty page. */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
): { pageItems: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: safePage,
    totalPages
  };
}

/**
 * Owns page state for a client-filtered list. Pass whatever the list is
 * filtered/searched by as `resetKey` (e.g. a search query) — changing it
 * resets to page 1, so narrowing the results never strands you on a page
 * past the new end.
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
  resetKey?: unknown
) {
  const [page, setPage] = useState(1);
  // Reset to page 1 when resetKey changes, adjusted during render (React's
  // documented pattern for this) rather than in an effect, which would
  // commit the stale page first and flash it before snapping back.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  return { ...paginate(items, page, pageSize), setPage, total: items.length };
}
