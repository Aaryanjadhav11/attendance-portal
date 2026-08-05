"use client";

interface FailStateProps {
  onRetry: () => void;
  onLogout: () => void;
  loading: boolean;
}

export default function FailState({ onRetry, onLogout, loading }: FailStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-2 text-4xl">🛠️</p>
        <h1 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          RITCMS went Wastagunahuya
        </h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Please wait while computer center, RIT does there job properly.
        </p>

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
