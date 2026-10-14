# Milestone: Appointment Booking (Epic SCRUM-17)

SerialSync — CSE 314 (Fall 2026). Sprint 3 / third epic: patient booking flow.

## Team contributions

| Member | Role |
|--------|------|
| FM Maftahul Jannat | Booking validation, status rules, QA docs |
| Md Adil Hossain | Appointment API, serial numbers, routes |
| Rohan Hasan Khan | Profile, bookings list, confirmation UI |
| Md Abu Rafe Mostak H. Fahim | Booking integration tests |

## Deliverables

| Jira | Item | Location |
|------|------|----------|
| SCRUM-34 | Search & find doctor | `/home`, `GET /api/doctors` |
| SCRUM-35 | View doctor profile | `/doctors/[id]`, `GET /api/doctors/:doctorId` |
| SCRUM-36 | Select date & time | `/doctors/[id]/schedule` |
| SCRUM-37 | Book appointment | `POST /api/schedules/slots/book` |
| SCRUM-39 | Confirmation | `/bookings/[id]` |
| SCRUM-40 | Appointment history | `GET /api/appointments/me`, `/bookings` |
| SCRUM-41 | Cancel appointment | `POST /api/appointments/:id/cancel` |
| SCRUM-42 | Status management | `PATCH /api/appointments/:id/status` |

Appointments are stored in `SlotBooking` with `serialNumber`, `confirmationCode`, and `status`.

## Verification

```bash
cd backend && npm test
cd frontend && npm run build
```

See [MANUAL_QA_BOOKING.md](./MANUAL_QA_BOOKING.md).
