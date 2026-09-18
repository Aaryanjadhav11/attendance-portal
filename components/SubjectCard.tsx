"use client";

import { useState } from "react";
import { calcAttendance } from "@/lib/ritcms/calc";
import type { Subject } from "@/lib/ritcms/types";

export default function SubjectCard({ subject }: { subject: Subject }) {
  const [open, setOpen] = useState(false);
  const [previewFlips, setPreviewFlips] = useState<Set<number>>(new Set());
  const good = subject.percent >= 75;

  function toggleFlip(i: number) {
    setPreviewFlips((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const previewing = previewFlips.size > 0;
  const previewMath = previewing
    ? calcAttendance(subject.present + previewFlips.size, subject.total)
    : null;

  const displayPresent = previewMath ? subject.present + previewFlips.size : subject.present;
  const displayPercent = previewMath ? previewMath.percent : subject.percent;
  const displayGood = displayPercent >= 75;
  const displaySkippable = previewMath ? previewMath.skippable : subject.skippable;
  const displayRequired = previewMath ? previewMath.required : subject.required;

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

        <p
          className={`mt-1 text-sm ${
            previewing
              ? "text-purple-600 dark:text-purple-400"
              : good
                ? "text-neutral-600 dark:text-neutral-400"
                : "text-red-600 dark:text-red-400"
          }`}
        >
          Att: ({displayPresent}/{subject.total}) → {displayPercent.toFixed(2)}%
          {previewing && <span className="text-purple-500 dark:text-purple-400"> (preview)</span>}
        </p>

        {displayGood ? (
          displaySkippable > 0 ? (
            <p className={`text-sm ${previewing ? "text-purple-600 dark:text-purple-400" : "text-green-600 dark:text-green-400"}`}>
              Safe to skip: {displaySkippable} classes
            </p>
          ) : (
            <p className={`text-sm ${previewing ? "text-purple-600 dark:text-purple-400" : "text-yellow-600 dark:text-yellow-400"}`}>
              On the edge: don&apos;t skip!
            </p>
          )
        ) : (
          <p className={`text-sm ${previewing ? "text-purple-600 dark:text-purple-400" : "text-red-600 dark:text-red-400"}`}>
            Need to attend: {displayRequired} more
          </p>
        )}
      </button>

      {open && (
        <div className="mt-3 max-h-64 overflow-y-auto border-t border-neutral-100 pt-3 dark:border-neutral-800">
          {subject.records.length === 0 ? (
            <p className="text-sm text-neutral-400">No records found.</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-neutral-400">
                  Tap an absent lecture to preview what your attendance would look like if it were present.
                </p>
                {previewing && (
                  <button
                    type="button"
                    onClick={() => setPreviewFlips(new Set())}
                    className="shrink-0 text-xs font-medium text-purple-600 underline dark:text-purple-400"
                  >
                    Reset preview
                  </button>
                )}
              </div>
              <ul className="text-sm">
                {subject.records.map((r, i) => {
                  const flipped = r.status === "A" && previewFlips.has(i);
                  const clickable = r.status === "A";
                  return (
                    <li key={i}>
                      <div
                        className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${
                          flipped ? "bg-purple-50 dark:bg-purple-950/40" : ""
                        }`}
                      >
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {r.date}
                          {r.time ? <span className="text-neutral-400"> · {r.time}</span> : null}
                        </span>
                        <button
                          type="button"
                          disabled={!clickable}
                          onClick={() => toggleFlip(i)}
                          title={clickable ? "Preview this lecture as present (does not change your real record)" : undefined}
                          className={
                            flipped
                              ? "font-medium text-purple-600 underline decoration-dotted dark:text-purple-400"
                              : r.status === "P"
                                ? "font-medium text-green-600 dark:text-green-400"
                                : "font-medium text-red-600 underline decoration-dotted dark:text-red-400"
                          }
                        >
                          {flipped ? "P (preview)" : r.status}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
