import { LOGIN_URL } from "./constants";
import { timedFetch, type Session } from "./http";
import { buildHiddenPayload, getAcademicYearOption, loadHtml } from "./parse";
import { LoginFailedError } from "./types";

/**
 * Logs into RITCMS. Throws LoginFailedError on bad credentials, or
 * CmsUnreachableError (from timedFetch) on network/timeout failure.
 */
export async function login(
  session: Session,
  prn: string,
  password: string,
): Promise<void> {
  const getResp = await timedFetch(session, LOGIN_URL);
  const getHtml = await getResp.text();
  const $ = loadHtml(getHtml);

  const payload = buildHiddenPayload($, "form#form1");
  payload["txt_UserId"] = prn;
  payload["txt_password"] = password;
  payload["cmd_LogIn"] = "Login";
  payload["_LASTFOCUS"] = "";
  payload["EVENTTARGET"] = "";
  payload["_EVENTARGUMENT"] = "";

  const yearOption = getAcademicYearOption($);
  if (yearOption) payload[yearOption.name] = yearOption.value;

  const postResp = await timedFetch(session, LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload),
  });
  const postHtml = await postResp.text();
  const lower = postHtml.toLowerCase();

  if (!lower.includes("logout") && !lower.includes("welcome")) {
    throw new LoginFailedError();
  }
}
