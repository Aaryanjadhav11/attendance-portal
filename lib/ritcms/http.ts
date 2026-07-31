import { CookieJar } from "tough-cookie";
import fetchCookie from "fetch-cookie";
import { REQUEST_TIMEOUT_MS } from "./constants";
import { CmsUnreachableError } from "./types";

// One cookie-jar-aware fetch per scrape request, mirroring Python's
// `requests.Session()` — hidden ASP.NET session/viewstate cookies picked up
// from one response are automatically replayed on the next request.
export function createSession() {
  const jar = new CookieJar();
  return fetchCookie(fetch, jar);
}

export type Session = ReturnType<typeof createSession>;

export async function timedFetch(
  session: Session,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await session(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new CmsUnreachableError(
      err instanceof Error ? err.message : "Network error contacting CMS",
    );
  }
}
