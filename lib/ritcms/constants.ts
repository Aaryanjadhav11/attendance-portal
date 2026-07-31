// RITCMS is served over plain HTTP only — all requests to it must happen
// server-side (API routes), never from the browser, to avoid mixed-content
// and CORS failures.
export const BASE_URL = "http://210.212.171.172";
export const LOGIN_URL = `${BASE_URL}/ritcms/Default.aspx`;
export const STUDENT_HOME_URL = `${BASE_URL}/ritcms/Student/frm_StudentHome.aspx`;
export const ATTENDANCE_URL = `${BASE_URL}/ritcms/Attendance_TeachingStaffDataEntry/frm_Attendance_ViewStudentAttendance.aspx`;

// Different academic-year deployments of RITCMS have shown up with
// different grid ids for the subjects table, so we try them in order
// instead of hard-failing on the first miss.
export const SUBJECTS_TABLE_IDS = ["GridViewLecturesConducted", "GVSubjects"];

export const REQUEST_TIMEOUT_MS = 15_000;

export const ATTENDANCE_TARGET = 0.75;
