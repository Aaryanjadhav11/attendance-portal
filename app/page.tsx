"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FailState from "@/components/FailState";
import LoginForm from "@/components/LoginForm";
import PullToRefresh from "@/components/PullToRefresh";
import StudentBanner from "@/components/StudentBanner";
import SummaryBar from "@/components/SummaryBar";
import SubjectCard from "@/components/SubjectCard";
import { clearCredentials, getSavedCredentials, saveCredentials } from "@/lib/clientAuth";
import { debugError, debugLog } from "@/lib/debug";
import { clearResult, getCachedResult, saveResult } from "@/lib/resultCache";
import type { ScrapeResult } from "@/lib/ritcms/types";

function isEmptyResult(result: ScrapeResult): boolean {
  return result.subjects.length === 0 || result.overall.total === 0;
}

export default function Home() {
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSavedLogin, setCheckingSavedLogin] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [session, setSession] = useState<{ prn: string; password: string } | null>(null);

  const submit = useCallback(
    async (prn: string, password: string, persist: boolean, bypassCache = false) => {
      setLoading(true);
      setError(null);
      setSession({ prn, password });

      if (!bypassCache) {
        const cached = getCachedResult(prn);
        if (cached) {
          debugLog("using cached result", { prn, ageMs: cached.ageMs });
          setResult(cached.data);
          setUpdatedAt(Date.now() - cached.ageMs);
          if (persist) saveCredentials(prn, password);
          setLoading(false);
          return;
        }
      }

      try {
        const resp = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prn, password }),
        });

        if (resp.status === 401) {
          debugLog("login rejected (401)", { prn });
          clearCredentials();
          clearResult();
          setError("Login failed — check your PRN and password.");
          setResult(null);
          return;
        }

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          debugError("attendance request failed", { status: resp.status, body });
          setError(body.error ?? "Something went wrong. Try again.");
          return;
        }

        const data: ScrapeResult = await resp.json();
        if (isEmptyResult(data)) {
          debugLog("scrape succeeded but result is empty", { prn, data });
        } else {
          debugLog("scrape succeeded", { prn, subjects: data.subjects.length });
        }
        setResult(data);
        setUpdatedAt(Date.now());
        saveResult(prn, data);
        if (persist) saveCredentials(prn, password);
      } catch (err) {
        debugError("network error contacting /api/attendance", err);
        setError("Network error — could not reach the server.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const refresh = useCallback(() => {
    if (!session) return;
    void submit(session.prn, session.password, true, true);
  }, [session, submit]);

  const logout = useCallback(() => {
    clearCredentials();
    clearResult();
    setSession(null);
    setResult(null);
  }, []);

  useEffect(() => {
    // One-time client-only init: cookies aren't readable during SSR, so
    // this has to run post-mount. Deliberately setting state directly here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckingSavedLogin(false);
    const saved = getSavedCredentials();
    if (saved) {
      void submit(saved.prn, saved.password, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Ticks the "Updated N minutes ago" label; kept out of render so we
    // never call Date.now() directly during render (react-hooks/purity).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Worst attendance first, so subjects below 75% (or on the edge) surface
  // at the top instead of getting buried below the rest of the list.
  const sortedSubjects = useMemo(
    () => [...(result?.subjects ?? [])].sort((a, b) => a.percent - b.percent),
    [result],
  );

  if (checkingSavedLogin) return null;

  if (!result) {
    return (
      <LoginForm
        onSubmit={(prn, password) => submit(prn, password, true)}
        loading={loading}
        error={error}
      />
    );
  }

  if (isEmptyResult(result)) {
    return <FailState onRetry={refresh} onLogout={logout} loading={loading} error={error} />;
  }

  return (
    <PullToRefresh onRefresh={refresh} refreshing={loading}>
      <div className="min-h-screen bg-neutral-50 px-4 py-4 pb-16 sm:py-6 dark:bg-neutral-950">
        <div className="mx-auto max-w-md">
          {session && <StudentBanner student={result.student} prn={session.prn} />}

          <div className="mb-1 flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Attendance
            </h1>
            <div className="flex shrink-0 items-center gap-3 text-sm">
              <button
                type="button"
                onClick={logout}
                className="text-neutral-500 underline dark:text-neutral-400"
              >
                Log out
              </button>
            </div>
          </div>

          {loading && (
            <p className="mb-4 text-xs text-neutral-400 dark:text-neutral-600">Refreshing…</p>
          )}

          {!loading && updatedAt && now && (
            <p className="mb-4 text-xs text-neutral-400 dark:text-neutral-600">
              Updated {formatAge(now - updatedAt)}
            </p>
          )}

          <SummaryBar overall={result.overall} />

          {sortedSubjects.map((s) => (
            <SubjectCard key={s.idx} subject={s} />
          ))}
        </div>
      </div>
    </PullToRefresh>
  );
}

function formatAge(ageMs: number): string {
  const mins = Math.round(ageMs / 60_000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  return `${mins} minutes ago`;
}
