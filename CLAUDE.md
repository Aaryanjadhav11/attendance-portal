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
  `index.ts`.
- `app/api/attendance/route.ts` — single `POST` endpoint. Takes
  `{ prn, password }`, runs the full login+scrape+calc in one request, and
  returns `{ subjects, overall }`. Returns `401` on bad credentials (the
  frontend clears its saved cookies on this), `502` on CMS
  network/timeout errors. Exports `maxDuration = 60` (see `vercel.json`)
  since a slow campus CMS can take longer than Vercel Hobby's 10s default.
  **No session state persists between calls** — each request creates a
  fresh cookie jar and re-authenticates from scratch.
- `app/page.tsx` + `components/` — client-side UI: login form, or (if
  cookies are already saved) auto-login straight into the dashboard
  showing an overall summary bar and one expandable card per subject.

## Guardrails
- **Never** reintroduce `v2.py`'s hardcoded `ACCOUNTS` dict, or any real
  student PRN/password, into this repo. Login is user-entered only.
- Keep all RITCMS HTTP calls inside `lib/ritcms/*` / the API route — never
  add a client-side fetch to `210.212.171.172`.
