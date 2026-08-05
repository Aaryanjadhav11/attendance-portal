import { NextRequest, NextResponse } from "next/server";
import { debugError, debugLog } from "@/lib/debug";
import { scrapeAttendance } from "@/lib/ritcms";
import { CmsUnreachableError, LoginFailedError } from "@/lib/ritcms/types";

// Hobby tier default is 10s; this multi-step scrape against a slow campus
// CMS needs more headroom.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { prn?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { prn, password } = body;
  if (typeof prn !== "string" || typeof password !== "string" || !prn || !password) {
    return NextResponse.json({ error: "PRN and password are required" }, { status: 400 });
  }

  try {
    const result = await scrapeAttendance(prn, password);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof LoginFailedError) {
      debugLog("login failed", { prn });
      return NextResponse.json({ error: "Login failed" }, { status: 401 });
    }
    if (err instanceof CmsUnreachableError) {
      debugError("CMS unreachable", err);
      return NextResponse.json({ error: "CMS unreachable, try again" }, { status: 502 });
    }
    debugError("unexpected error scraping attendance", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
