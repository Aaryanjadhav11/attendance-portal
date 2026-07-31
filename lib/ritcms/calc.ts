import { ATTENDANCE_TARGET } from "./constants";

export interface AttendanceMath {
  percent: number;
  skippable: number;
  required: number;
}

/** Ports v2.py's skip/required math 1:1 (75% target). */
export function calcAttendance(present: number, total: number): AttendanceMath {
  if (total === 0) return { percent: 0, skippable: 0, required: 0 };

  const percent = (present / total) * 100;

  if (percent >= 75) {
    // P / (N + x) >= 0.75  =>  x <= (P / 0.75) - N
    const skippable = Math.floor(present / ATTENDANCE_TARGET - total);
    return { percent, skippable, required: 0 };
  }

  // (P + y) / (N + y) >= 0.75  =>  y >= (0.75N - P) / 0.25
  const required = Math.ceil(
    (ATTENDANCE_TARGET * total - present) / (1 - ATTENDANCE_TARGET),
  );
  return { percent, skippable: 0, required };
}
