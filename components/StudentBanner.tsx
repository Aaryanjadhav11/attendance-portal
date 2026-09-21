import type { StudentInfo } from "@/lib/ritcms/types";

/**
 * Shown at the very top of the dashboard so it's unmistakable whose
 * attendance is on screen — saved credentials auto-login on load, so
 * without this a stale/shared session could look like your own data.
 */
export default function StudentBanner({
  student,
  prn,
}: {
  student: StudentInfo;
  prn: string;
}) {
  const details = [student.class, student.branch, student.academicYear].filter(Boolean);

  return (
    <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40">
      <p className="truncate text-base font-semibold text-blue-900 dark:text-blue-100">
        {student.name ?? "Unknown student"}
      </p>
      <p className="truncate text-xs text-blue-700/80 dark:text-blue-300/80">
        {details.length > 0 ? `${details.join(" · ")} · ` : ""}
        PRN {prn}
      </p>
    </div>
  );
}
