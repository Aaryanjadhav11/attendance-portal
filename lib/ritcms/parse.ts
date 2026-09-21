import * as cheerio from "cheerio";
import { debugLog } from "../debug";
import type { AttendanceRecord, StudentInfo } from "./types";

export function loadHtml(html: string) {
  return cheerio.load(html);
}

/**
 * Extracts every hidden <input name=... value=...> under `scopeSelector`
 * (defaults to the ASP.NET postback form) into a flat payload object —
 * the ViewState/EventValidation fields every postback must replay.
 */
export function buildHiddenPayload(
  $: cheerio.CheerioAPI,
  scopeSelector = "form#form1",
): Record<string, string> {
  const scope = $(scopeSelector).length ? $(scopeSelector) : $.root();
  const payload: Record<string, string> = {};
  scope.find("input[type=hidden]").each((_, el) => {
    const name = $(el).attr("name");
    if (name) payload[name] = $(el).attr("value") ?? "";
  });
  return payload;
}

/** Reads the selected (or first) <option> of the academic-year dropdown. */
export function getAcademicYearOption(
  $: cheerio.CheerioAPI,
): { name: string; value: string } | null {
  const select = $("select#txt_AcademicYear");
  if (!select.length) return null;
  const name = select.attr("name");
  if (!name) return null;
  const option = select.find("option[selected]").first().length
    ? select.find("option[selected]").first()
    : select.find("option").first();
  if (!option.length) return null;
  return { name, value: option.attr("value") ?? "" };
}

/**
 * Best-effort extraction of the logged-in student's name/class/branch/
 * academic year from the attendance page (these are shown there alongside
 * the subjects grid), so the UI can clearly show "whose login is this" —
 * important since auto-login means the page can load someone else's saved
 * session without an explicit login step. RITCMS deployments vary, so each
 * field tries known label id patterns first, then falls back to a
 * "Label: value" text match; a field is null (with a debugLog) if nothing
 * matches, never fails the whole scrape.
 */
export function parseStudentInfo($: cheerio.CheerioAPI): StudentInfo {
  const info: StudentInfo = {
    name: findField($, ["StudentName", "lblName", "Name"], /\bname\b\s*[:\-]\s*([A-Za-z][A-Za-z .]{2,60})/i),
    class: findField($, ["Class", "lblClass"], /\bclass\s*[:\-]\s*([A-Za-z0-9][A-Za-z0-9 ./-]{1,40})/i),
    branch: findField($, ["Branch", "lblBranch", "Department"], /\bbranch\s*[:\-]\s*([A-Za-z][A-Za-z0-9 .&/-]{1,60})/i),
    academicYear: findField(
      $,
      ["AcademicYear", "lblAcademicYear", "lblYear"],
      /\bacademic\s*year\s*[:\-]\s*([0-9][0-9 \-–\/]{2,12}[0-9])/i,
    ),
  };

  if (!info.name && !info.class && !info.branch && !info.academicYear) {
    debugLog("student info not found on attendance page");
  }
  return info;
}

function findField(
  $: cheerio.CheerioAPI,
  idFragments: string[],
  textPattern: RegExp,
): string | null {
  for (const fragment of idFragments) {
    const el = $(`[id*='${fragment}' i]`).first();
    if (el.length) {
      const text = cleanField(el.text());
      if (text) return text;
    }
  }

  const match = $("body").text().match(textPattern);
  return match ? cleanField(match[1]) : null;
}

function cleanField(raw: string): string | null {
  const text = raw
    .replace(/^[^:]*:/, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text || text.length > 60) return null;
  return text;
}

/** Finds the subjects grid by trying each known id in order, first match wins. */
export function findSubjectsTable(
  $: cheerio.CheerioAPI,
  candidateIds: string[],
): { table: cheerio.Cheerio<import("domhandler").Element>; id: string } | null {
  for (const id of candidateIds) {
    const table = $(`table#${id}`);
    if (table.length) return { table, id };
  }
  return null;
}

/** Parses a subjects grid's data rows into {code, name}, mirroring v2.py's cols[1:5] slice. */
export function parseSubjectRows(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<import("domhandler").Element>,
): { code: string; name: string }[] {
  const rows = table.find("tr").slice(1);
  const out: { code: string; name: string }[] = [];
  rows.each((_, row) => {
    const cols = $(row)
      .find("td")
      .toArray()
      .map((td) => $(td).text().trim());
    if (cols.length < 5) return;
    const [code, name] = cols.slice(1, 5);
    out.push({ code, name });
  });
  return out;
}

/** Parses the #Panel2 date-wise attendance table into {date, status} records. */
export function parseAttendanceDetail($: cheerio.CheerioAPI): AttendanceRecord[] {
  const table = $("#Panel2 table").first();
  if (!table.length) {
    debugLog("attendance detail table (#Panel2 table) not found");
    return [];
  }

  const headers = table
    .find("th")
    .toArray()
    .map((th) => $(th).text().trim());
  const dateIdx = headers.findIndex((h) => /date/i.test(h));
  const statusIdx = headers.findIndex((h) => /attendance/i.test(h));
  const timeIdx = headers.findIndex((h) => /time|lecture/i.test(h));
  if (dateIdx < 0 || statusIdx < 0) {
    debugLog("attendance detail headers missing date/status column", headers);
  }

  const rows = table.find("tr").slice(1);
  const records: AttendanceRecord[] = [];
  rows.each((_, row) => {
    const cells = $(row)
      .find("td")
      .toArray()
      .map((td) => $(td).text().trim());
    if (!cells.length) return;
    const record: AttendanceRecord = {
      date: cells[dateIdx >= 0 ? dateIdx : 0] ?? "Unknown",
      status: cells[statusIdx >= 0 ? statusIdx : cells.length - 1] ?? "?",
    };
    if (timeIdx >= 0 && cells[timeIdx]) record.time = cells[timeIdx];
    records.push(record);
  });
  return records;
}
