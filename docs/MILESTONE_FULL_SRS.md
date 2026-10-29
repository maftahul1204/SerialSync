# SerialSync — Full SRS implementation map

Complete feature delivery against the CSE 314 SRS (Modules 1–6).

## Module 1 — Authentication & RBAC
| SRS | Feature | Status |
|-----|---------|--------|
| FR (auth) | Register, login, logout, JWT cookies | Done |
| FR | Password reset | Done |
| FR | Profile | Done |
| FR-28 | Doctor approval / moderation | Done (`doctorApprovalStatus`, admin panel) |

## Module 2 — Multi-location schedules
| SRS | Feature | Status |
|-----|---------|--------|
| FR-01, FR-14 | Chambers, weekly schedules, conflict detection | Done |
| FR-02 | Doctor search & filters | Done (`/home`, `/api/doctors`) |

## Module 3 — Booking & serials
| SRS | Feature | Status |
|-----|---------|--------|
| FR-03 | Atomic serial allocation | Done (Redis `INCR` with in-memory fallback) |
| FR-04 | QR appointment pass | Done (`GET /api/appointments/:id/qr`) |
| FR-11 | Cancel appointment | Done |
| SCRUM-37–42 | Book, confirm, history, status | Done |

## Module 4 — Live queue & assistant console
| SRS | Feature | Status |
|-----|---------|--------|
| FR-06 | Socket.io live queue | Done (`/queue`, `queue_updated`) |
| FR-07 | Call next serial | Done (`/dashboard/assistant`) |
| FR-08 | Walk-in #11B | Done |
| FR-09 | Delay broadcast | Done (+15/30/45) |
| FR-10 | No-show + 60s undo | Done |
| FR-12 | Pause / resume session | Done |
| FR-13 | Turn alert (audio when ≤2 ahead) | Done (Web Audio chime) |

## Module 5 — Home diagnostics & reports
| SRS | Feature | Status |
|-----|---------|--------|
| FR-16 | Test catalog | Done (`/diagnostics`, seed catalog) |
| FR-17 | Home collection booking | Done |
| FR-18 | Phlebotomist assign | Done (auto-assign first phlebotomist) |
| FR-19–20 | Barcode & lab status | Done (phlebotomist console) |
| FR-21–22 | PDF upload + HMAC download | Done (local storage + SHA-256 + 15m token) |
| FR-23 | Share report with doctor | Done (API) |
| FR-25 | Health packages | Done (Executive / Diabetic bundles) |

## Module 6 — Administration
| SRS | Feature | Status |
|-----|---------|--------|
| Doctor moderation | Approve / reject doctors | Done |
| Report upload | Admin PDF attach | Done (`POST /api/diagnostics/orders/:id/report`) |

## Optional / production infra (SRS mentions, not required for local demo)
- AWS S3 presigned URLs → local `backend/storage/reports` + HMAC gate
- Redis cluster → optional `REDIS_URL`; memory fallback when unset
- SMS / push notifications → not wired (booking still confirms in UI)
- BMDC certificate upload → use doctor approval workflow instead

## Seed & test accounts
```bash
cd backend && npm run seed:test-users
```
See `docs/TEST_LOGIN_ACCOUNTS.txt`.

## Key routes (web)
| Role | Entry |
|------|--------|
| Patient | `/home`, `/queue`, `/diagnostics`, `/reports`, `/bookings` |
| Doctor | `/dashboard`, `/dashboard/schedule` |
| Assistant | `/dashboard/assistant` |
| Phlebotomist | `/dashboard/collections` |
| Admin | `/dashboard/admin`, diagnostics report upload API |
