"use client";

import { useState } from "react";
import type { Subject } from "@/lib/ritcms/types";

export default function SubjectCard({ subject }: { subject: Subject }) {
  const [open, setOpen] = useState(false);
  const good = subject.percent >= 75;

  return (
    <div className="mb-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {subject.code} — {subject.name}
          </span>
          <span className="text-neutral-400">{open ? "−" : "+"}</span>
        </div>

        <p className={`mt-1 text-sm ${good ? "text-neutral-600 dark:text-neutral-400" : "text-red-600 dark:text-red-400"}`}>
          Att: ({subject.present}/{subject.total}) → {subject.percent.toFixed(2)}%
        </p>

        {good ? (
          subject.skippable > 0 ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              Safe to skip: {subject.skippable} classes
            </p>
          ) : (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              On the edge: don&apos;t skip!
            </p>
          )
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">
            Need to attend: {subject.required} more
          </p>
        )}
      </button>

      {open && (
        <div className="mt-3 max-h-64 overflow-y-auto border-t border-neutral-100 pt-3 dark:border-neutral-800">
          {subject.records.length === 0 ? (
            <p className="text-sm text-neutral-400">No records found.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {subject.records.map((r, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">{r.date}</span>
                  <span
                    className={
                      r.status === "P"
                        ? "font-medium text-green-600 dark:text-green-400"
                        : "font-medium text-red-600 dark:text-red-400"
                    }
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
