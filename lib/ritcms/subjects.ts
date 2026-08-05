import { ATTENDANCE_URL, STUDENT_HOME_URL, SUBJECTS_TABLE_IDS } from "./constants";
import { calcAttendance } from "./calc";
import { timedFetch, type Session } from "./http";
import {
  buildHiddenPayload,
  findSubjectsTable,
  loadHtml,
  parseAttendanceDetail,
  parseSubjectRows,
} from "./parse";
import type { AttendanceRecord, Subject } from "./types";

async function scrapeAttendanceDetails(
  session: Session,
  url: string,
  payload: Record<string, string>,
): Promise<AttendanceRecord[]> {
  const resp = await timedFetch(session, url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload),
  });
  const html = await resp.text();
  return parseAttendanceDetail(loadHtml(html));
}

/**
 * Navigates Student Home -> Attendance module, finds the subjects grid,
 * then fetches every subject's date-wise detail in parallel (the original
 * CLI did this sequentially; these POSTs are independent postbacks against
 * the same base payload/session, so parallelizing is safe and is the main
 * lever for staying under Vercel's function timeout — though ASP.NET's
 * per-session request locking may still serialize them server-side).
 */
export async function fetchSubjects(session: Session): Promise<Subject[]> {
  const homeResp = await timedFetch(session, STUDENT_HOME_URL);
  const homeHtml = await homeResp.text();
  const home$ = loadHtml(homeHtml);

  const navPayload = buildHiddenPayload(home$, "form#form1");
  navPayload["ctl00$ContentPlaceHolder1$btnATTN"] = "";

  const attnResp = await timedFetch(session, STUDENT_HOME_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(navPayload),
  });
  const dynamicAttnUrl = attnResp.url;
  const attnHtml = await attnResp.text();
  const $ = loadHtml(attnHtml);

  const basePayload = buildHiddenPayload($, "form#form1");
  const found = findSubjectsTable($, SUBJECTS_TABLE_IDS);
  if (!found) return [];

  const rows = parseSubjectRows($, found.table);

  const subjects = await Promise.all(
    rows.map(async ({ code, name }, idx) => {
      const payload = {
        ...basePayload,
        __EVENTTARGET: found.id,
        __EVENTARGUMENT: `Select$${idx}`,
      };
      const records = await scrapeAttendanceDetails(session, dynamicAttnUrl, payload);
      const present = records.filter((r) => r.status === "P").length;
      const total = records.length;
      const { percent, skippable, required } = calcAttendance(present, total);

      const subject: Subject = {
        idx,
        code,
        name,
        present,
        total,
        percent,
        records,
        skippable,
        required,
      };
      return subject;
    }),
  );

  return subjects;
}
