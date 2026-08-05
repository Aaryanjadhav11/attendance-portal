# CLAUDE.md

## What this project is
A Next.js web app that lets students check their RITCMS attendance and see
how many lectures they can safely skip (or must attend) to hit a 75%
target. It's a hosted rewrite of the CLI scraper at `d:\Projects\v2.py`
(outside this repo — read-only reference for the original scrape logic).
The RITCMS server (`http://210.212.171.172`) is plain HTTP only, so all
scraping happens server-side via a Next.js API route to avoid mixed-content
and CORS errors — the browser never talks to the CMS directly.

See `plan.md` for the original project spec/directives this app was built from.

## Tooling — read this first
Node and npm are **only** installed inside the conda env `iucee-test`
(node v24.4.1, npm 11.4.2). They are not on system PATH. Always run
commands as:

```
conda run -n iucee-test npm run dev
conda run -n iucee-test npm run build
conda run -n iucee-test npm run lint
conda run -n iucee-test npm install <pkg>
```

There is no Python runtime in `iucee-test` — the backend is Node.js only
(cheerio replaces BeautifulSoup, `tough-cookie` + `fetch-cookie` replace
`requests.Session()`).

## Tech stack
- Next.js (App Router, TypeScript), Tailwind CSS v4.
- `cheerio` for HTML parsing.
- `tough-cookie` + `fetch-cookie` for a cookie-jar-aware `fetch`, needed to
  replicate a `requests.Session()` across RITCMS's multi-step ASP.NET
  WebForms postback flow (login → home nav → subject list → per-subject
  detail) within one serverless invocation.
- `js-cookie` on the client to persist PRN/password (30-day expiry) so
  users don't have to log in every visit.
- **No `.env` file, no database, no auth provider.** The CMS URL and other
  config are plain constants (`lib/ritcms/constants.ts`) — nothing here is
  a secret worth an env var. The only sensitive data (PRN/password) is
  supplied by the user per-request and never stored server-side.

## Architecture
- `lib/ritcms/` — the ported scraping logic, one file per concern
  (`constants.ts`, `http.ts`, `parse.ts`, `login.ts`, `subjects.ts`,
  `calc.ts`, `types.ts`), tied together by `scrapeAttendance()` in
  `index.ts`. `subjects.ts`'s `fetchSubjects()` returns `[]` silently if
  RITCMS's subjects grid doesn't match a known table id
  (`SUBJECTS_TABLE_IDS` in `constants.ts`) — this is the main way a
  successful login still ends up with zero attendance (see Debugging
  below).
- `app/api/attendance/route.ts` — single `POST` endpoint. Takes
  `{ prn, password }`, runs the full login+scrape+calc in one request, and
  returns `{ subjects, overall }`. Returns `401` on bad credentials (the
  frontend clears its saved cookies on this), `502` on CMS
  network/timeout errors, `500` on anything unexpected. A `200` can still
  carry an empty result (`subjects: []` / `overall.total: 0`) — that's not
  an HTTP-level error, it's the CMS scrape coming back empty. Exports
  `maxDuration = 60` (see `vercel.json`) since a slow campus CMS can take
  longer than Vercel Hobby's 10s default. **No session state persists
  between calls** — each request creates a fresh cookie jar and
  re-authenticates from scratch.
- `app/page.tsx` — sole client-side state owner (login form vs. dashboard
  vs. fail state, loading/error, saved-session bootstrap). Renders one of:
  - `components/LoginForm.tsx` — no saved cookies / not logged in.
  - `components/FailState.tsx` — login succeeded but the scrape came back
    empty (`subjects.length === 0 || overall.total === 0`). Cheeky
    "RITCMS went Wastagunahuya" message with Try again / Log out; wired to
    the same `refresh()`/`logout()` used by the dashboard.
  - Dashboard (`components/SummaryBar.tsx` + one
    `components/SubjectCard.tsx` per subject) — normal non-empty result.
  - `lib/clientAuth.ts` (cookie persistence) and `lib/resultCache.ts`
    (10-minute localStorage cache keyed by PRN, to avoid re-scraping on
    every page load) back this flow.

## Debugging & error handling
- `lib/debug.ts` exports `debugLog`/`debugError` — thin wrappers around
  `console.debug`/`console.error`, prefixed `[RITCMS]`. They're **always
  on, including in production** (no dev-only gating): the goal is that a
  broken scrape can be diagnosed from the browser console (client-side
  calls) or Vercel function logs (server-side calls) without needing a
  local repro. Never pass the password to them.
- Called at every point that swallows a failure into an empty/degraded
  result or a thrown error: `subjects.ts` (subjects table not found),
  `parse.ts` (`#Panel2` detail table or header columns not found),
  `login.ts` (login check failed), `http.ts` (`timedFetch` network
  failure), `index.ts` (scrape start/done), the API route (every catch
  branch), and `app/page.tsx` (every client-side error/empty branch).
- **The site UI only ever shows short, user-facing error strings**
  (`LoginForm`'s inline error text, `FailState`'s cheeky copy) — never raw
  errors, stack traces, or debug payloads. When adding a new failure mode,
  put the diagnostic detail in a `debugLog`/`debugError` call and keep the
  UI-facing string terse.

## Guardrails
- **Never** reintroduce `v2.py`'s hardcoded `ACCOUNTS` dict, or any real
  student PRN/password, into this repo. Login is user-entered only.
- Keep all RITCMS HTTP calls inside `lib/ritcms/*` / the API route — never
  add a client-side fetch to `210.212.171.172`.
- Never log PRN+password together or the raw password via `debugLog`/
  `debugError` — only PRN (a student ID, not a secret) may appear in logs.
- Never put raw error objects, stack traces, or scrape debug output into
  UI-facing state (`setError`, component props) — console/log-only.
