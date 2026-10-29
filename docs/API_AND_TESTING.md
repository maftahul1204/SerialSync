# SerialSync — REST API & Integration Testing Documentation

**Version:** October 2026 (implementation-aligned)  
**Base URL:** `http://localhost:5050` (configurable via `PORT`)  
**Format:** JSON (`Content-Type: application/json`) unless noted  
**Authentication:** HTTP-only JWT cookie (`serialsync_token`) or `Authorization: Bearer <token>`

This document mirrors **SRS Chapter 6** (API modules) and **Chapter 7** (system testing), updated to match the shipped Express 5 API under `/api/*` (not `/api/v1/*`).

---

## 1. Conventions

| HTTP code | Meaning |
|-----------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Missing or invalid session |
| 403 | RBAC / approval gate |
| 404 | Resource not found |
| 409 | Conflict (duplicate booking, schedule overlap) |
| 500 | Server error |

**Roles:** `patient`, `doctor`, `assistant`, `phlebotomist`, `admin`

**Response envelope (typical):** `{ "success": true, ... }` or `{ "success": false, "message": "..." }`

---

## 2. Module 1 — Authentication & User Management

### 2.1 Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | Public | Service liveness |

### 2.2 Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register user; sets session cookie |
| POST | `/api/auth/login` | Public | Login with `email`, `password` |
| POST | `/api/auth/logout` | Cookie | Clears session |
| GET | `/api/auth/me` | Cookie | Current session user |
| POST | `/api/auth/forgot-password` | Public | Reset request (test env returns `resetToken`) |
| POST | `/api/auth/reset-password` | Public | `{ token, password }` |
| POST | `/api/auth/change-password` | Cookie | `{ currentPassword, newPassword }` |

**Register body:** `fullName`, `email`, `password` (min 8), optional `phone`, `role`, `doctorProfile` (doctors)

**Sample register response (201):**

```json
{
  "success": true,
  "user": { "id": "...", "email": "...", "role": "patient", "fullName": "..." }
}
```

### 2.3 User profile (`/api/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Cookie | Extended profile |
| PATCH | `/api/users/me` | Cookie | Update `fullName`, `phone`, `patientProfile`, etc. |
| GET | `/api/users/admin/overview` | Admin | RBAC smoke endpoint |

---

## 3. Module 2 — Doctors, Chambers & Schedules

### 3.1 Doctor directory (`/api/doctors`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/doctors` | Cookie | Search/list approved doctors (`q`, `specialty`, `city`) |
| GET | `/api/doctors/:doctorId` | Cookie | Public doctor profile + chambers summary |

### 3.2 Chambers (`/api/chambers`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/chambers` | Doctor (approved) | List own chambers |
| POST | `/api/chambers` | Doctor (approved) | Create chamber |
| PATCH | `/api/chambers/:id` | Doctor (approved) | Update chamber |
| GET | `/api/chambers/directory` | Assistant, Admin | Cross-doctor chamber directory |

### 3.3 Schedules (`/api/schedules`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/schedules/doctors/:doctorId` | Public | Active schedules + chambers for booking UI |
| GET | `/api/schedules/doctors/:doctorId/slots` | Public | Slot grid `?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| GET | `/api/schedules/me` | Doctor (approved) | Own schedules |
| POST | `/api/schedules` | Doctor (approved) | Create availability |
| PATCH | `/api/schedules/:id` | Doctor (approved) | Update times/days |
| DELETE | `/api/schedules/:id` | Doctor (approved) | Remove availability |
| PATCH | `/api/schedules/:id/status` | Doctor (approved) | `{ status: "active" \| "inactive" }` |
| POST | `/api/schedules/slots/book` | Patient, Admin | Book slot → creates appointment |

**Create schedule required fields:** `chamberId`, `daysOfWeek[]` (0–6), `startTime`, `endTime`, `consultationFee`, `slotDurationMinutes` (5–120)

**Book body:** `{ scheduleId, date, slotStart }`

---

## 4. Module 3 — Appointments & Serial Booking

### 4.1 Appointments (`/api/appointments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/appointments/me` | Patient, Admin | Patient booking history |
| GET | `/api/appointments/doctor/day` | Doctor, Admin | Day itinerary `?date=` |
| GET | `/api/appointments/:id` | Cookie | Detail (owner, doctor, admin) |
| GET | `/api/appointments/:id/qr` | Cookie | PNG data URL + JSON payload for SmartPass |
| POST | `/api/appointments/:id/cancel` | Patient, Admin | Cancel booking |
| PATCH | `/api/appointments/:id/status` | Doctor, Admin | Update visit status |

Serial numbers are allocated atomically per doctor-day via Redis `INCRBY` with in-memory fallback.

---

## 5. Module 4 — Live Queue & Chamber Console

### 5.1 REST (`/api/queue`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/queue/me/today` | Patient | Live position for today’s appointment |
| GET | `/api/queue/sessions/:id` | Cookie | Full queue state |
| POST | `/api/queue/sessions` | Assistant, Admin, Doctor | Ensure session `{ doctorId, chamberId, date }` |
| POST | `/api/queue/sessions/:id/advance` | Assistant, Admin | Serve next patient |
| POST | `/api/queue/sessions/:id/walk-in` | Assistant, Admin | `{ afterSerial, patientName, priority?, reason? }` |
| POST | `/api/queue/sessions/:id/no-show` | Assistant, Admin | `{ bookingId }` |
| POST | `/api/queue/sessions/:id/undo` | Assistant, Admin | Undo last no-show |
| POST | `/api/queue/sessions/:id/delay` | Assistant, Admin | `{ delayMinutes, delayReason? }` |
| POST | `/api/queue/sessions/:id/pause` | Assistant, Admin | `{ paused, pauseMessage? }` |

### 5.2 WebSocket (Socket.io)

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join_queue` | Client → Server | `{ sessionId }` | Subscribe to room `queue:<sessionId>` |
| `leave_queue` | Client → Server | `{ sessionId }` | Unsubscribe |
| `queue_updated` | Server → Client | Queue state object | Emitted after REST mutations |

**Path:** `/socket.io` — auth via same JWT cookie or `auth.token` in handshake.

---

## 6. Module 5 — Home Diagnostics & Reports

### 6.1 Diagnostics (`/api/diagnostics`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/diagnostics/tests` | Cookie | Catalog `?search=&category=` |
| GET | `/api/diagnostics/packages` | Cookie | Bundled test packages |
| POST | `/api/diagnostics/orders` | Patient | Home collection order |
| GET | `/api/diagnostics/orders/me` | Patient | Own orders |
| GET | `/api/diagnostics/orders/assigned` | Phlebotomist, Admin | Dispatch queue |
| GET | `/api/diagnostics/orders/:id` | Cookie | Order detail (RBAC) |
| PATCH | `/api/diagnostics/orders/:id/status` | Phlebotomist, Admin | Status workflow |
| POST | `/api/diagnostics/orders/:id/report` | Admin | Multipart PDF upload (`report`) |
| GET | `/api/diagnostics/orders/:id/download` | Cookie | Signed PDF download |
| POST | `/api/diagnostics/orders/:id/share-doctor` | Patient | Share report with doctor |

**Create order body:** `testIds[]` or `packageId`, `address`, `contactPhone`, `preferredDate`, `timeSlot`

Reports stored on disk under `REPORTS_STORAGE_DIR`; download URLs use HMAC-SHA256 (`REPORT_HMAC_SECRET`).

---

## 7. Module 6 — Administration & Moderation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/doctors` | Admin | List doctors `?status=pending\|approved\|rejected\|all` |
| PATCH | `/api/admin/doctors/:id/approval` | Admin | `{ status: "approved" \| "rejected" \| "pending" }` |

Pending doctors cannot create chambers (`403`, code `DOCTOR_PENDING`).

---

## 8. Integration test suite

**Run:** `cd backend && npm test`  
**Runner:** Node.js built-in test runner + Supertest  
**Database:** MongoDB Memory Server (isolated per run)  
**Concurrency:** `--test-concurrency=1` to avoid cross-file data races

### 8.0 Pass and fail testing

| Kind | File | Cases | Result |
|------|------|-------|--------|
| Pass (valid requests) | `auth, schedule, booking, doctors, admin, queue, diagnostics, appointments .test.js`, `features.test.js`, `doctorOnboarding.test.js`, `centers.test.js` (PT-*) | 66 | 66 passed |
| Fail (invalid / unauthorised / conflicting) | `negative.test.js`, `features.test.js`, `doctorOnboarding.test.js`, `centers.test.js` (FT-*) | 96 | 96 passed |

Fail tests assert the documented 4xx status and `{ success: false }` for every module (401 no session, 403 wrong role or pending doctor, 400 validation or malformed id, 404 unknown resource, 409 duplicate or overlapping). The full tables are in Chapter 6 (Sections 6.8 and 6.9) of the SRS.

### 8.1 Pass test inventory (37 cases)

| ID / file | Test case | API covered |
|-----------|-----------|-------------|
| auth.test.js | SCRUM-94 registration + weak password | POST `/api/auth/register` |
| auth.test.js | SCRUM-96 login valid/invalid | POST `/api/auth/login` |
| auth.test.js | SCRUM-98 logout + 401 on `/me` | POST `/api/auth/logout`, GET `/api/auth/me` |
| auth.test.js | SCRUM-100 forgot/reset password | POST forgot/reset |
| auth.test.js | SCRUM-105 RBAC admin route | GET `/api/users/admin/overview` |
| auth.test.js | SCRUM-107 profile GET/PATCH | `/api/users/me` |
| auth.test.js | health | GET `/api/health` |
| schedule.test.js | SCRUM-26 chamber + schedule create | chambers, schedules POST |
| schedule.test.js | SCRUM-26 slot duration required | schedules validation |
| schedule.test.js | SCRUM-27 PATCH schedule | PATCH `/api/schedules/:id` |
| schedule.test.js | SCRUM-28 DELETE schedule | DELETE `/api/schedules/:id` |
| schedule.test.js | SCRUM-29 public doctor schedules | GET `/api/schedules/doctors/:id` |
| schedule.test.js | SCRUM-31 overlap conflict 409 | POST schedules |
| schedule.test.js | SCRUM-32 inactive hidden | PATCH status + public GET |
| schedule.test.js | SCRUM-30 slot quota | book + 409 duplicate slot |
| booking.test.js | SCRUM-37 serial + confirmation | POST `/api/schedules/slots/book` |
| booking.test.js | SCRUM-40 appointment list | GET `/api/appointments/me` |
| booking.test.js | SCRUM-41 cancel | POST cancel |
| booking.test.js | SCRUM-37 duplicate booking | 409 on second book |
| booking.test.js | SCRUM-35 doctor profile | GET `/api/doctors/:id` |
| doctors.test.js | directory auth + payload | GET `/api/doctors` |
| admin.test.js | approval gates directory | admin PATCH + doctors GET |
| admin.test.js | pending doctor chambers blocked | POST `/api/chambers` |
| admin.test.js | admin list/reject | GET/PATCH `/api/admin/doctors` |
| queue.test.js | session ensure + advance | POST sessions, advance |
| queue.test.js | patient `/queue/me/today` | GET `/api/queue/me/today` |
| queue.test.js | walk-in RBAC | POST walk-in 403/201 |
| diagnostics.test.js | list tests | GET `/api/diagnostics/tests` |
| diagnostics.test.js | create order | POST `/api/diagnostics/orders` |
| diagnostics.test.js | list my orders | GET orders/me |
| diagnostics.test.js | packages | GET packages |
| appointments.test.js | QR SmartPass | GET `/:id/qr` |
| appointments.test.js | appointment RBAC | GET `/:id` 403 |

### 8.2 Requirements traceability (excerpt)

| SRS use case | Primary endpoints | Automated test |
|--------------|-------------------|----------------|
| UC-01 Register / login | `/api/auth/*` | auth.test.js |
| UC-05 Doctor availability | `/api/chambers`, `/api/schedules` | schedule.test.js |
| UC-08 Book serial | `/api/schedules/slots/book` | booking.test.js |
| UC-10 Live queue | `/api/queue/*`, Socket.io | queue.test.js |
| UC-12 Diagnostics | `/api/diagnostics/*` | diagnostics.test.js |
| UC-15 BMDC moderation | `/api/admin/doctors` | admin.test.js |

### 8.3 Manual / future tests

| Area | Suggested manual or E2E test |
|------|------------------------------|
| Socket.io latency | Browser client join + advance from assistant console |
| Report PDF upload/download | Admin upload + patient HMAC download |
| Phlebotomist dispatch | Register phlebotomist, assign order, PATCH status |
| Doctor day dashboard | GET `/api/appointments/doctor/day?date=` |

---

## 8.4 Extensions (notifications, family, analytics, admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Cookie | Paginated in-app notifications + `unread` count |
| PATCH | `/api/notifications/:id/read` | Owner | Mark one read |
| POST | `/api/notifications/read-all` | Cookie | Mark all read |
| GET/POST | `/api/family` | Patient | List / add family members (max 10) |
| PATCH/DELETE | `/api/family/:id` | Owner patient | Edit / remove |
| POST | `/api/schedules/slots/book` | Patient | now accepts `familyMemberId` |
| GET | `/api/appointments/doctor/summary?date=` | Doctor, Admin | End-of-day summary (FR-15) |
| GET | `/api/diagnostics/trends?code=` | Patient | Result history for charts (FR-27) |
| POST | `/api/diagnostics/orders/:id/report` | Admin | PDF + `results` JSON; derives abnormal flags |
| GET | `/api/diagnostics/orders` | Admin | All orders, paginated |
| POST/PATCH | `/api/diagnostics/tests[/:id]` | Admin | Manage catalogue |
| GET | `/api/admin/audit` | Admin | Audit log |
| GET | `/api/ready` | Public | Readiness probe |
| POST | `/api/auth/register` (multipart) | Public | Doctor signup: BMDC number + documents (PDF/JPG/PNG, 5 MB) stored under `backend/storage/doctor-documents/<id>/` |
| POST / GET | `/api/users/me/documents[/:docId]` | Doctor | Replace / view own documents |
| GET | `/api/admin/doctors/:id` | Admin | Full details + document checklist |
| GET | `/api/admin/doctors/:id/documents/:docId` | Admin | Open a document inline |
| PATCH | `/api/admin/doctors/:id/approval` | Admin | approve (all documents required) / reject (reason required) |
| POST | `/api/schedules/:id/cancel-day` | Doctor | Close a chamber day, cancel + notify booked patients |
| DELETE | `/api/schedules/:id/closed-dates/:date` | Doctor | Reopen the day |
| GET | `/api/diagnostics/centers` | Cookie | Centers with price quote, hours and live status |
| POST / PATCH | `/api/diagnostics/centers[/:id]` | Admin | Manage centers |

SMS: `SMS_PROVIDER=console` (default, logs) or `http` with `SMS_API_URL` / `SMS_API_KEY`.

---

## 9. Environment variables (API)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection |
| `JWT_SECRET` | Access token signing |
| `CLIENT_URL` | CORS origin |
| `PORT` | API port (default 5050) |
| `REDIS_URL` | Optional serial/queue atomicity |
| `REPORT_HMAC_SECRET` | Diagnostic PDF download tokens |
| `REPORTS_STORAGE_DIR` | Local PDF storage |

---

## 10. Regenerate PDF

```bash
.venv-pdf/bin/python scripts/generate_api_testing_pdf.py
```

Output: `SerialSync_API_and_Testing_Documentation.pdf` (repository root).

Rebuild SRS Chapters 6, 8 and 9 (Ogro-aligned) with `generate_api_testing_pdf.py --chapter` followed by `scripts/restructure_srs.py`.
