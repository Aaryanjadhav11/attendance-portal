export interface AttendanceRecord {
  date: string;
  status: "P" | "A" | string;
  time?: string;
}

export interface Subject {
  idx: number;
  code: string;
  name: string;
  present: number;
  total: number;
  percent: number;
  records: AttendanceRecord[];
  skippable: number;
  required: number;
}

export interface OverallSummary {
  present: number;
  total: number;
  percent: number;
}

export interface StudentInfo {
  name: string | null;
  class: string | null;
  branch: string | null;
  academicYear: string | null;
}

export interface ScrapeResult {
  subjects: Subject[];
  overall: OverallSummary;
  student: StudentInfo;
}

export class LoginFailedError extends Error {
  constructor(message = "Login failed") {
    super(message);
    this.name = "LoginFailedError";
  }
}

export class CmsUnreachableError extends Error {
  constructor(message = "CMS unreachable") {
    super(message);
    this.name = "CmsUnreachableError";
  }
}
