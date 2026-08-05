import { debugLog } from "../debug";
import { createSession } from "./http";
import { login } from "./login";
import { fetchSubjects } from "./subjects";
import type { ScrapeResult } from "./types";

export * from "./types";

/**
 * Full end-to-end scrape for one request: fresh cookie jar, login, then
 * every subject's detail in parallel. No session state is persisted
 * between calls — each request re-authenticates from scratch.
 */
export async function scrapeAttendance(
  prn: string,
  password: string,
): Promise<ScrapeResult> {
  debugLog("scrape start", { prn });
  const session = createSession();
  await login(session, prn, password);
  const subjects = await fetchSubjects(session);

  const totalPresent = subjects.reduce((sum, s) => sum + s.present, 0);
  const totalLectures = subjects.reduce((sum, s) => sum + s.total, 0);
  const overallPercent = totalLectures > 0 ? (totalPresent / totalLectures) * 100 : 0;

  debugLog("scrape done", { prn, subjects: subjects.length, totalLectures });

  return {
    subjects,
    overall: { present: totalPresent, total: totalLectures, percent: overallPercent },
  };
}
