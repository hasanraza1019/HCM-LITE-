# HCM Lite — AI-Assisted Human Capital Management System
**Saylani Hackathon · 24 October 2026 · Zaitoon Ashraf IT Park**  
**Submission for Saylani LMS:** [https://lms.saylaniit.com/](https://lms.saylaniit.com/)

---

## 🏆 Project Highlights
- **Full End-to-End Delivery:** All 9 modules and 25 functionalities completely implemented and working.
- **Bonus Track (+10 Points Fully Implemented):**
  1. **Camera Attendance with Biometric & Geofence Verification:** Live camera feed with face detection bounding box and GPS Haversine distance check against office perimeter (default 150m).
  2. **Workforce Anomaly Flags & Attrition Risk Scoring:** Automated alerts on high absenteeism and punctuality risks on HR dashboard.
  3. **Late Penalty Automation:** 3 late arrivals automatically deduct 0.5 day's pay in monthly payroll.
  4. **Roman Urdu NLP Understanding:** AI assistant natively understands queries like *"Bhai ki shadi hai aglay peer chutti chahiye"* and *"Kitni chuttiyan baki hain"*.
  5. **Dark Mode & Responsive UI (375px+):** Instant theme toggle and mobile self-service experience.

---

## 🧱 Tech Stack
- **Backend:** Node.js (v20+), TypeScript, Express.js, **MongoDB Atlas & Mongoose** (serverless-cached connection ready for Vercel).
- **Security & RBAC:** JWT authentication, BCrypt password hashing, role & data-scope guards, immutable audit logs with before/after JSON diffs.
- **Document Generation:** PDFKit for generating official salary payslips.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Canvas-Confetti.
- **Deployment:** Configured for **Vercel** (supports both Separate Frontend/Backend Vercel projects and 1-Click Unified Monorepo deployment).
- **AI Engine:** Google Gemini API / Hosted LLM API integration with tool calling (`get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_my_leave_balance`, `get_payroll_summary`, `search_employees`) and deterministic fallback engine.

---

## ☁️ Deploying on Vercel + MongoDB Atlas

### Step 1: MongoDB Atlas Network Access
1. Open your **MongoDB Atlas** dashboard → **Network Access** (under Security).
2. Click **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) and click **Confirm** (required so Vercel serverless functions can connect).

### Step 2: Deploy on Vercel (Option 1 — Two Separate Projects: Backend + Frontend)
1. **Deploy Backend:**
   - Import this GitHub repository in Vercel.
   - Set **Root Directory** to `backend`.
   - Add Environment Variables:
     - `MONGODB_URI` = `mongodb+srv://hasanraza6565655_db_user:<YOUR_DB_PASSWORD>@cluster0.akk0kmn.mongodb.net/hcm_lite?retryWrites=true&w=majority`
     - `JWT_SECRET` = `any_long_random_secret_string`
     - `GEMINI_API_KEY` = *(optional)*
   - Click **Deploy** and copy your Backend URL (e.g. `https://hcm-lite-backend.vercel.app`).
2. **Deploy Frontend:**
   - Import the same GitHub repository in Vercel as a second project.
   - Set **Root Directory** to `frontend`.
   - Add Environment Variable:
     - `VITE_API_URL` = `https://hcm-lite-backend.vercel.app` *(your Backend URL)*
   - Click **Deploy**.

### Alternative: Deploy on Vercel (Option 2 — Single Unified Project)
- Import the repository in Vercel keeping **Root Directory** at `./` (root).
- Add `MONGODB_URI` and `JWT_SECRET` in Environment Variables (leave `VITE_API_URL` empty) and click **Deploy**. Both React SPA and `/api/*` Express serverless routes will run under one URL!

---

## 🚀 Quick Start (Judge Guide — Runs in Under 5 Minutes)

### Prerequisites
- Node.js (v20+ or v22/v24 recommended)
- Git

### 1. Clone & Install
```bash
# Clone the repository
git clone <your-repo-link>
cd module-27

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ..
```

### 2. Environment Configuration
Backend contains `.env.example`:
```bash
cp backend/.env.example backend/.env
```
Open `backend/.env` and replace `<db_password>` in `MONGODB_URI` with your MongoDB Atlas password (make sure URL-special characters like `@` or `#` in the password are URL-encoded).  
*(Optional: Provide `GEMINI_API_KEY=your_key` or `AI_API_KEY=your_key` in `backend/.env` for hosted Gemini model. HCM Lite includes a built-in intelligent simulated tool engine that works out of the box even without an external API key!)*

### 3. Option A: First-Run Setup Wizard (Fresh Install)
Start both servers:
```bash
# Terminal 1: Start Backend Server (port 5000)
npm run dev:backend

# Terminal 2: Start Frontend App (port 3000)
npm run dev:frontend
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.  
The system will detect a fresh installation and launch the **First-Run Setup Wizard** asking for:
- Company Name (e.g. *Saylani IT Training*)
- Office Start Time (*09:00*), Grace Period (*15 min*), Half-Day (*5.0 hrs*)
- Geofence Location (Zaitoon Ashraf IT Park coordinates: `24.8607, 67.0011`, Radius `150m`)
- Master Admin Email & Password

### 4. Option B: Instant Demo Seeder (Fast Track for Judges)
To populate the complete Hackathon demo company, employees, attendance records, leaves, and payroll in 1 second:
```bash
npm run seed:demo
```
**Demo Credentials:**
| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Admin** | `admin@saylaniit.com` | `Admin@123` | Complete company governance, setup, audit logs, payroll finalization |
| **HR** | `hr@saylaniit.com` | `Hr@123` | People operations, employee onboarding, daily attendance board, leave inbox, payroll draft |
| **Employee** | `ali.khan@saylaniit.com` | `Employee@123` | Self-service, attendance clock-in, leave apply, payslip PDF download |

---

## 📋 5-Minute Demo Script (Judges Checklist)

1. **First-Run Setup:**
   - Admin sets up the company name, office start time (09:00, 15 min grace), geofence location, and creates master Admin.
   - Admin goes to **System Accounts** (`/admin/users`) and provisions an HR login.
2. **HR Employee Registration & Temporary Password:**
   - HR logs in and registers an employee (`/employees`).
   - The registered employee logs in with temporary password `Password@123` and is prompted to change it on first sign-in before accessing their dashboard.
3. **Attendance & Biometric Camera Check-in:**
   - Employee performs check-in via Web Check-In or **Camera + Geofence Check-In** (face frame detection + GPS verification).
   - Second check-in on same day returns `409 Conflict: Already checked in today`.
4. **Smart Leave Application in Plain Words:**
   - Employee enters: *"Need next Monday and Tuesday off for sister's wedding"* or Roman Urdu *"Bhai ki shadi hai chutti chahiye"*.
   - AI extracts JSON `{ type: "Casual", start, end, reason }`, excludes weekends and public holidays, and pre-fills the form.
   - HR visits **Leave Approvals Inbox** (`/leave/inbox`) and approves it with comment.
5. **Analytics & AI Summary:**
   - HR opens the HR Dashboard (`/hr`), clicks **"Summarize with AI"** to generate instant insight bullets from live numbers.
   - HR asks the AI Assistant: *"Who is on leave today?"* -> Assistant calls `get_leave_summary` and reports the approved employee.
6. **Monthly Payroll Run & Locked Finalization:**
   - HR creates monthly payroll draft (`/payroll`). Server computes working days, deductions (absences, unpaid leaves, late penalties), progressive income tax, and net pay.
   - Admin logs in and clicks **"Finalize & Lock Payroll"**. The month is permanently locked (cannot be edited).
   - In-app notification is sent to employees.
7. **Payslip PDF & Security Refusal:**
   - Employee visits **My Payslips** (`/payslips`) and downloads the official PDF generated via PDFKit.
   - Employee asks AI Assistant: *"What is Sara Ahmed's salary?"* -> AI **politely refuses**: *"I cannot disclose salary or personal compensation details of other employees."*
   - Admin visits **Immutable Audit Trail** (`/admin/audit`) and inspects before/after JSON diffs.

---

## 📊 Live Test Questions & Answers

| Role | Question | Good Answer (HCM Lite Behavior) |
|---|---|---|
| **HR** | *How many active employees are in Engineering?* | Returns exact live headcount: `There are currently 1 active employee(s) in the Engineering department.` (matches dashboard). |
| **HR** | *Who came late most often this month?* | Calls `get_late_comers`: lists employee name, department, and late frequency. |
| **HR** | *What is this month's attendance rate?* | Calls `get_attendance_summary`: returns percentage based on `(present + late + 0.5*half_day) / total_employees`. |
| **Employee** | *How many sick leaves do I have left this year?* | Calls `get_my_leave_balance`: returns 8 remaining (0 used). |
| **Employee** | *What is colleague's salary?* | **Refuses politely:** *"I cannot disclose salary or personal compensation details of other employees. In accordance with company privacy policy and data governance rules, compensation details are confidential."* |
| **Employee** | *I need next Monday and Tuesday off for my sister's wedding* | Pre-fills Casual leave, computes working days, sets correct dates and reason. |

---

## 📁 Repository Structure
```
module-27/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/      # Auth, Org, Employee, Attendance, Leave, Payroll, Analytics, AI, Comms
│   │   ├── database/         # SQLite schema init & seedDemo script
│   │   ├── middleware/       # JWT auth & role/data scope guard
│   │   ├── routes/           # 9 Express route modules
│   │   ├── services/         # AI tool runner & LLM integration
│   │   ├── utils/            # Audit logger, Haversine formula, Tax calculator, Date utilities
│   │   └── server.ts         # Express backend entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Layout, AIAssistantDrawer, CameraCheckInModal
│   │   ├── context/          # AuthContext, ThemeContext (dark mode)
│   │   ├── pages/            # 13 Screen components covering all 9 modules
│   │   ├── services/         # API fetch client
│   │   ├── types/            # TypeScript data contracts
│   │   ├── App.tsx           # Router with role-based protected routes
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── package.json              # Monorepo root scripts
└── README.md
```

---

## 📝 Done & Not Done Checklist
- [x] **M1: Auth & Access:** JWT login, bcrypt, 3 roles, server-side role & data-scope guards, first-run wizard, forced password change on first employee login.
- [x] **M2: Organization Setup:** Office start time (09:00), grace time (15m), half day (<5h), weekends, office location + radius, departments, designations, leave quotas, holidays.
- [x] **M3: Employees:** Directory search & filters, pagination, Employee 360 profile, CSV Import with dry-run error report, CSV Export.
- [x] **M4: Attendance:** Server-stamped time, single check-in/day rule (409 Conflict), status rules (late > 09:15, half day < 5h, absent, missing checkout), daily attendance board, attendance corrections inbox.
- [x] **M5: Leave:** Working days only (skipping weekends & holidays), quotas (Annual 14, Sick 8, Casual 10, Unpaid unlimited), overlap check (422), over-balance check (422), HR approval inbox.
- [x] **M6: Payroll Lite:** Gross = 1.5 × Basic (HRA 40%, Medical 10%), per day rate = gross ÷ working days, absent/unpaid/half-day deductions, progressive tax slabs, Admin finalization lock, downloadable PDF payslip.
- [x] **M7: Dashboards & Analytics:** Admin, HR, and Employee dashboards with live database aggregations and charts.
- [x] **M8: AI Assistant:** 7 tool calling functions, policy system prompt, colleague salary privacy guardrail, 3-5 bullet dashboard summary, natural language Smart Leave, Roman Urdu understanding.
- [x] **M9: Comms & Audit:** Priority announcements, in-app notifications, Admin immutable audit log with before/after JSON diffs.
- [x] **Bonus Track (+10 pts):** Camera check-in with face detection + GPS Haversine verification, attrition risk score, anomaly flags, late penalty rule (3 lates = 0.5 day), Roman Urdu NLP, Dark Mode toggle.

---
*Built with ❤️ for Saylani Hackathon 2026 at Zaitoon Ashraf IT Park.*

