import type { ScrapeResult } from "@/lib/ritcms/types";

const CACHE_KEY = "ritcms_attendance_cache";
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  prn: string;
  timestamp: number;
  data: ScrapeResult;
}

/**
 * Returns the cached result for this PRN if it's still within TTL, along
 * with how old it is. RITCMS only updates attendance once per lecture, so
 * serving a few minutes of stale data avoids re-running the full
 * login+scrape (9+ requests to a slow campus server) on every page load.
 */
export function getCachedResult(
  prn: string,
): { data: ScrapeResult; ageMs: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.prn !== prn) return null;
    const ageMs = Date.now() - entry.timestamp;
    if (ageMs > CACHE_TTL_MS) return null;
    return { data: entry.data, ageMs };
  } catch {
    return null;
  }
}

export function saveResult(prn: string, data: ScrapeResult): void {
  try {
    const entry: CacheEntry = { prn, timestamp: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage unavailable (private browsing, quota, etc) — non-fatal, just
    // means the next load re-fetches instead of hitting the cache.
  }
}

export function clearResult(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
