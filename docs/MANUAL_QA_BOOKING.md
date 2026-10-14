# Manual QA — Appointment booking

Run API (`npm run dev` in `backend`) and web (`npm run dev` in `frontend`) with MongoDB up.

1. Sign in as `patient@serialsync.test` / `TestPass123!`
2. **Search** on `/home` — filters and specialty chips update the list.
3. Open a doctor → **profile** at `/doctors/[id]` — chambers, fee, rating.
4. **Book** from schedule page — pick date, book slot, land on confirmation with serial number.
5. **My bookings** at `/bookings` — upcoming visit listed; cancel releases slot.
6. Sign in as approved doctor — optional: status updates via API (`PATCH /api/appointments/:id/status`).

Resize to mobile width: booking cards and confirmation should stay readable.
