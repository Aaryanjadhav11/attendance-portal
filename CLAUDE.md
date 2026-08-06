# CLAUDE.md

## What this project is
Next.js web app: students check RITCMS attendance, see how many lectures
they can skip / must attend to hit 75%. Hosted rewrite of the CLI scraper
at `d:\Projects\v2.py` (outside repo, read-only reference). RITCMS
(`http://210.212.171.172`) is plain HTTP only, so all scraping happens
server-side via one Next.js API route — browser never talks to the CMS
directly. Original spec: `plan.md`.

## Tooling — read this first
Node/npm only exist inside conda env `iucee-test` (node v24.4.1, npm
11.4.2) — not on system PATH. Always prefix commands:
```
conda run -n iucee-test npm run dev|build|lint
conda run -n iucee-test npm install <pkg>
```
No Python runtime in `iucee-test` — backend is Node.js only.

## Tech stack & deps (package.json)
Next.js 16.2.12 (App Router, TS, Turbopack), React 19.2.4, Tailwind v4.
Runtime deps: `cheerio` (HTML parsing, replaces BeautifulSoup),
`tough-cookie` + `fetch-cookie` (cookie-jar fetch, replaces
`requests.Session()`), `js-cookie` (client-side PRN/password persistence).
**No `.env`, no database, no auth provider.** CMS URL/config are plain
constants in `lib/ritcms/constants.ts` — nothing here is a secret worth an
env var. PRN/password come from the user per-request, never stored
server-side. `vercel.json` sets `maxDuration: 60` for the API route.

## File map
Every file's exports + behavior, so minor edits don't require re-reading
the whole tree. Signatures are current as of last update — verify with a
quick Read/Grep if a signature looks load-bearing for your change.

### `lib/ritcms/` — ported scraper, one concern per file
- **`constants.ts`** — `BASE_URL="http://210.212.171.172"`, `LOGIN_URL`,
  `STUDENT_HOME_URL`, `ATTENDANCE_URL` (built from `BASE_URL`).
  `SUBJECTS_TABLE_IDS = ["GridViewLecturesConducted", "GVSubjects"]` (tried
  in order — different RITCMS deployments use different grid ids).
  `REQUEST_TIMEOUT_MS = 15_000`. `ATTENDANCE_TARGET = 0.75`.
- **`types.ts`** — `AttendanceRecord{date,status:"P"|"A"|string}`,
  `Subject{idx,code,name,present,total,percent,records,skippable,required}`,
  `OverallSummary{present,total,percent}`, `ScrapeResult{subjects,overall}`.
  `LoginFailedError`, `CmsUnreachableError` (both `extends Error`) — thrown
  by `login.ts`/`http.ts`, caught in the API route to pick HTTP status.
- **`http.ts`** — `createSession()` → cookie-jar-aware fetch (one per
  scrape request). `type Session = ReturnType<typeof createSession>`.
  `timedFetch(session, url, init?)`: fetch with `REQUEST_TIMEOUT_MS`
  abort signal; wraps any failure in `CmsUnreachableError` (logs via
  `debugError` first).
- **`parse.ts`** (cheerio helpers) — `loadHtml(html)` → `cheerio.load`.
  `buildHiddenPayload($, scopeSelector="form#form1")` → flat
  `Record<string,string>` of every hidden `<input>` under scope (ASP.NET
  ViewState/EventValidation replay). `getAcademicYearOption($)` → reads
  `select#txt_AcademicYear`'s selected/first `<option>` as
  `{name,value}|null`. `findSubjectsTable($, candidateIds)` → first
  matching `table#<id>` as `{table,id}|null`. `parseSubjectRows($, table)`
  → `{code,name}[]` from rows, skipping header, `cols.slice(1,5)` (mirrors
  v2.py). `parseAttendanceDetail($)` → reads `#Panel2 table`, finds
  date/status columns by header regex (`/date/i`, `/attendance/i`),
  returns `AttendanceRecord[]`; empty array + `debugLog` if table/headers
  missing.
- **`login.ts`** — `login(session, prn, password): Promise<void>`. GET
  `LOGIN_URL`, build hidden payload, set `txt_UserId`/`txt_password`/
  `cmd_LogIn="Login"` + academic-year option, POST. Success check: response
  HTML (lowercased) must contain `"logout"` or `"welcome"`, else throws
  `LoginFailedError`.
- **`subjects.ts`** — `fetchSubjects(session): Promise<Subject[]>`. Nav
  Student Home → click `ctl00$ContentPlaceHolder1$btnATTN` → find subjects
  table via `SUBJECTS_TABLE_IDS` (returns `[]` + `debugLog` if none match —
  **main cause of a successful login still yielding zero attendance**) →
  parse rows → `Promise.all` one detail POST per subject (`__EVENTTARGET`=
  table id, `__EVENTARGUMENT="Select$<idx>"`) → `calcAttendance` per
  subject. Note: imports `ATTENDANCE_URL` from constants but doesn't use it
  (existing lint warning, harmless — it's dead import, not dead logic).
- **`calc.ts`** — `calcAttendance(present,total): {percent,skippable,
  required}`. `total===0` → all zeros. `percent>=75` → `skippable =
  floor(present/0.75 - total)`, `required=0`. Else `required =
  ceil((0.75*total - present) / 0.25)`, `skippable=0`. 1:1 port of v2.py.
- **`index.ts`** — `scrapeAttendance(prn,password): Promise<ScrapeResult>`.
  Fresh `createSession()` → `login()` → `fetchSubjects()` → sums
  present/total across subjects → `overall.percent` (0 if no lectures).
  No session state persists between calls. Re-exports `./types`.

### `app/api/attendance/route.ts`
`POST` only. Body `{prn,password}` (400 if missing/wrong type). Calls
`scrapeAttendance`. Catch: `LoginFailedError`→401 `{error:"Login failed"}`;
`CmsUnreachableError`→502 `{error:"CMS unreachable, try again"}`; else
500 `{error:"Unexpected server error"}`. Success→200 with full
`ScrapeResult` — **a 200 can still carry `subjects:[]`/`overall.total:0`**,
that's a scrape-came-back-empty case, not an HTTP error.
`export const maxDuration = 60`.

### `app/page.tsx` — sole client state owner
State: `result:ScrapeResult|null`, `loading`, `error:string|null`,
`checkingSavedLogin`, `updatedAt`, `now` (tick every 30s for "updated N min
ago"), `session:{prn,password}|null`.
`isEmptyResult(result)` = `subjects.length===0 || overall.total===0`.
`submit(prn,password,persist,bypassCache=false)`: checks
`getCachedResult` unless bypassed → else POSTs `/api/attendance` →
401→clear creds+cache, set terse error, back to LoginForm; !ok→set
`body.error` as-is; ok→`setResult`, `saveResult` cache, `saveCredentials`
if persist; network throw→"Network error — could not reach the server."
`refresh()` = `submit(session.prn, session.password, true, true)`
(bypasses cache). `logout()` clears creds+cache+state.
On mount: bootstraps saved cookies via `getSavedCredentials()`+`submit`.
Render branches: `checkingSavedLogin` → null; `!result` → `LoginForm`;
`isEmptyResult(result)` → `FailState` (passes `error`); else dashboard
(`SummaryBar` + `SubjectCard[]`, refresh/logout buttons, "Updated Xm ago").

### `components/`
- **`LoginForm.tsx`** — props `{onSubmit(prn,password), loading, error}`.
  Own `prn`/`password` state. Shows `error` inline in red if set.
- **`FailState.tsx`** — props `{onRetry, onLogout, loading, error?:
  string|null}`. Cheeky "RITCMS went Wastagunahuya" message + collapsible
  "More info" button (local `showDetail` state) that reveals `error ??
  FALLBACK_DETAIL` ("Login succeeded, but RITCMS returned no attendance
  data to show.") in a muted box. Try again / Log out buttons wired to
  `onRetry`/`onLogout`.
- **`SummaryBar.tsx`** — props `{overall:OverallSummary}`. Green if
  `percent>=75` else red pill: `present/total → percent%`.
- **`SubjectCard.tsx`** — props `{subject:Subject}`. Collapsible (local
  `open` state). Header: code/name, present/total/percent (red if <75%).
  Body when good: skippable count or "on the edge" if 0; when bad:
  required count. Expanded: per-date `AttendanceRecord[]` list, P green /
  else red.

### `lib/` (non-ritcms)
- **`debug.ts`** — `debugLog(...args)`/`debugError(context,err)`, prefix
  `[RITCMS]`, wrap `console.debug`/`console.error`. **Always on** (no
  dev-only gating) — diagnosis relies on browser console / Vercel logs.
  Never pass password to these.
- **`clientAuth.ts`** — cookies `ritcms_prn`/`ritcms_password`, 30-day
  expiry, via `js-cookie`. `getSavedCredentials()`→`{prn,password}|null`,
  `saveCredentials(prn,password)`, `clearCredentials()`.
- **`resultCache.ts`** — localStorage key `ritcms_attendance_cache`, TTL
  `10*60*1000`ms, keyed by PRN (mismatched PRN = cache miss).
  `getCachedResult(prn)`→`{data,ageMs}|null`. `saveResult(prn,data)`,
  `clearResult()`. All wrapped in try/catch (private browsing/quota-safe,
  fails silently to "just re-fetch").

### Other
- `app/layout.tsx` — Geist/Geist_Mono fonts, page metadata
  ("RITCMS Attendance"), renders `{children}` in a flex-col body. Also
  renders a fixed top-right GitHub icon link (all screens) to
  `https://github.com/Aaryanjadhav11/attendance-portal` — hardcoded repo
  URL, update if the repo is ever renamed/moved.
- `next.config.ts` — empty/default `NextConfig`.
- `vercel.json` — `functions["app/api/attendance/route.ts"].maxDuration=60`.

## Request lifecycle (for tracing a bug end-to-end)
`page.tsx submit()` → `POST /api/attendance` → `route.ts` → `index.ts
scrapeAttendance()` → `http.ts createSession()` → `login.ts login()` (GET+POST
`LOGIN_URL`, checks logout/welcome marker) → `subjects.ts fetchSubjects()`
(nav to attendance module, find grid via `SUBJECTS_TABLE_IDS`, parallel
per-subject detail POSTs) → `calc.ts calcAttendance()` per subject →
summed `overall` → JSON back to client → cached in `resultCache` →
rendered as dashboard, or `FailState` if empty.

## Debugging & error handling
- `debugLog`/`debugError` (`lib/debug.ts`) are called at every point that
  swallows a failure into empty/degraded output or a thrown error:
  `subjects.ts` (grid not found), `parse.ts` (`#Panel2`/header columns
  missing), `login.ts` (login check failed), `http.ts` (`timedFetch`
  network failure), `index.ts` (scrape start/done), the API route (every
  catch branch), `app/page.tsx` (every client error/empty branch).
- **UI only ever shows short, user-facing strings** (`LoginForm`'s inline
  error, `FailState`'s cheeky copy + its "More info" detail string) —
  never raw errors/stack traces/debug payloads. New failure modes: put
  diagnostic detail in `debugLog`/`debugError`, keep the UI string terse.

## Guardrails
- **Never** reintroduce `v2.py`'s hardcoded `ACCOUNTS` dict, or any real
  student PRN/password, into this repo. Login is user-entered only.
- Keep all RITCMS HTTP calls inside `lib/ritcms/*` / the API route — never
  add a client-side fetch to `210.212.171.172`.
- Never log PRN+password together or the raw password via `debugLog`/
  `debugError` — only PRN (a student ID, not a secret) may appear in logs.
- Never put raw error objects, stack traces, or scrape debug output into
  UI-facing state (`setError`, component props) — console/log-only.

## When this file goes stale
If a signature/constant quoted above doesn't match the file, trust the
file and fix this doc in the same edit — don't silently work around a
stale doc.
