"use client";

import { useCallback, useEffect, useState } from "react";
import LoginForm from "@/components/LoginForm";
import SummaryBar from "@/components/SummaryBar";
import SubjectCard from "@/components/SubjectCard";
import { clearCredentials, getSavedCredentials, saveCredentials } from "@/lib/clientAuth";
import type { ScrapeResult } from "@/lib/ritcms/types";

export default function Home() {
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSavedLogin, setCheckingSavedLogin] = useState(true);

  const submit = useCallback(async (prn: string, password: string, persist: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prn, password }),
      });

      if (resp.status === 401) {
        clearCredentials();
        setError("Login failed — check your PRN and password.");
        setResult(null);
        return;
      }

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Try again.");
        return;
      }

      const data: ScrapeResult = await resp.json();
      setResult(data);
      if (persist) saveCredentials(prn, password);
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // One-time client-only init: cookies aren't readable during SSR, so
    // this has to run post-mount. Deliberately setting state directly here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckingSavedLogin(false);
    const saved = getSavedCredentials();
    if (saved) {
      void submit(saved.prn, saved.password, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Attendance
          </h1>
          <button
            type="button"
            onClick={() => {
              clearCredentials();
              setResult(null);
            }}
            className="text-sm text-neutral-500 underline dark:text-neutral-400"
          >
            Log out
          </button>
        </div>

        <SummaryBar overall={result.overall} />

        {result.subjects.map((s) => (
          <SubjectCard key={s.idx} subject={s} />
        ))}
      </div>
    </div>
  );
}
