# Project Plan: RITCMS Attendance Web App (Vercel Deployment)

## 1. Project Context & Objectives
- **Goal:** Convert an existing Python-based CLI web scraper (`v2.py`) into a responsive web application for students to track their attendance.
- **Hosting Strategy:** Deploy on Vercel (Hobby Tier). To avoid Mixed Content and CORS errors when interacting with the unencrypted HTTP CMS (`http://210.212.171.172`), the app will use Vercel Serverless API routes as a backend proxy to perform the scraping.
- **Cost Constraint:** Must stay within Vercel's free Hobby Tier limits (100,000 function executions/day).
- **User Experience:** Students should be able to log in with their PRN and Password. Credentials must be stored in browser cookies for persistent, fast logins on subsequent visits without losing information.

## 2. Architecture Outline
- **Frontend (Client-Side):** Next.js (React).
  - Handles the UI, cookie management, and state.
  - Sends a secure HTTPS POST request containing the PRN and Password to the Vercel API route.
- **Backend (Server-Side / Vercel API):** Node.js or Python serverless function.
  - Acts as the proxy.
  - Receives credentials securely, makes the unencrypted HTTP requests to the CMS, parses the HTML, performs the math, and returns clean JSON to the frontend.
- **Storage:** Client-side cookies (e.g., using `js-cookie`) with a 30+ day expiration for persistent login. No external database is required.

## 3. Scraping Logic & Flow (Derived from `v2.py`)
The backend must replicate the exact multi-step request flow used in the original script to maintain the CMS session state.

### Step 3.1: Authentication
- **Endpoint:** `GET /ritcms/Default.aspx`
- **Action:** Extract `__VIEWSTATE`, `__VIEWSTATEGENERATOR`, and other hidden inputs.
- **Endpoint:** `POST /ritcms/Default.aspx`
- **Payload:** Combine hidden inputs with `txt_UserId` (PRN), `txt_password`, and the selected `DropDownListAcademicYear`.
- **Validation:** Check the response HTML for the presence of "logout" or "welcome" to confirm successful login.

### Step 3.2: Establish Session State
- **Endpoint:** `GET /ritcms/Student/frm_StudentHome.aspx`
- **Action:** Extract hidden inputs from the form.
- **Endpoint:** `POST /ritcms/Student/frm_StudentHome.aspx`
- **Payload:** Submit hidden inputs along with `ctl00$ContentPlaceHolder1$btnATTN` to trigger the backend redirect to the attendance module.

### Step 3.3: Fetch Subjects
- **Endpoint:** The response from the previous POST lands on `frm_Attendance_ViewStudentAttendance.aspx`.
- **Action:** 
  - Extract base hidden inputs.
  - Locate the subjects table (check for IDs: `GridViewLecturesConducted` or `GVSubjects`).
  - Extract subject codes, names, and index positions.

### Step 3.4: Fetch Detail Records & Calculate Math
- **Endpoint:** `POST /ritcms/Attendance_TeachingStaffDataEntry/frm_Attendance_ViewStudentAttendance.aspx`
- **Action (Iterative):** For each subject index:
  - Submit the base hidden inputs.
  - Set `__EVENTTARGET` to the active table ID.
  - Set `__EVENTARGUMENT` to `Select$<index>`.
  - Parse the resulting `#Panel2 table` for attendance records (Present 'P' vs Absent 'A').
- **Math Logic:** Target is 75% attendance.
  - *If Percent >= 75%:* `skippable = int((present / 0.75) - total)`
  - *If Percent < 75%:* `required = math.ceil((0.75 * total - present) / (1 - 0.75))`

## 4. Implementation Directives for Claude
- **NO CODE GENERATION YET:** Provide the folder structure and library recommendations first. Wait for further commands.
- **Proxy Approach:** Emphasize the separation of concerns. The frontend should never directly contact the `210.212.171.172` IP. All CMS interactions go through the `/api` route.
- **Cookie Implementation:** Ensure the cookie logic handles cases where the CMS password might have changed (e.g., clear cookies on a 401/Login Failed response from the API).
- **Error Handling:** Vercel functions have a timeout (usually 10s on Hobby). Ensure the scraping requests use appropriate timeouts so the function doesn't hang indefinitely.