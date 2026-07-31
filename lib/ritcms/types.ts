export interface AttendanceRecord {
  date: string;
  status: "P" | "A" | string;
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

export interface ScrapeResult {
  subjects: Subject[];
  overall: OverallSummary;
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
