"use client";

import { useState } from "react";

interface FailStateProps {
  onRetry: () => void;
  onLogout: () => void;
  loading: boolean;
  error?: string | null;
}

const FALLBACK_DETAIL =
  "Login succeeded, but RITCMS returned no attendance data to show. Check if attendance is avilable on ritage";

export default function FailState({ onRetry, onLogout, loading, error }: FailStateProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-2 text-4xl">🛠️</p>
        <h1 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          RITCMS went Wastagunahuya
        </h1>
        <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
          Please wait while &ldquo;Central Computer Center&rdquo; of RIT does their job properly.
        </p>

        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="mb-4 text-xs text-neutral-400 underline dark:text-neutral-600"
        >
          {showDetail ? "Hide info" : "More info"}
        </button>

        {showDetail && (
          <p className="mb-4 rounded-lg bg-neutral-100 p-3 text-left text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {error ?? FALLBACK_DETAIL}
          </p>
        )}

        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="mb-3 w-full rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white transition disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {loading ? "Retrying…" : "Try again"}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="text-sm text-neutral-500 underline dark:text-neutral-400"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
