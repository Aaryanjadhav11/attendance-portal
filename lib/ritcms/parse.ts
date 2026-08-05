import * as cheerio from "cheerio";
import type { AttendanceRecord } from "./types";

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
  if (!table.length) return [];

  const headers = table
    .find("th")
    .toArray()
    .map((th) => $(th).text().trim());
  const dateIdx = headers.findIndex((h) => /date/i.test(h));
  const statusIdx = headers.findIndex((h) => /attendance/i.test(h));

  const rows = table.find("tr").slice(1);
  const records: AttendanceRecord[] = [];
  rows.each((_, row) => {
    const cells = $(row)
      .find("td")
      .toArray()
      .map((td) => $(td).text().trim());
    if (!cells.length) return;
    records.push({
      date: cells[dateIdx >= 0 ? dateIdx : 0] ?? "Unknown",
      status: cells[statusIdx >= 0 ? statusIdx : cells.length - 1] ?? "?",
    });
  });
  return records;
}
