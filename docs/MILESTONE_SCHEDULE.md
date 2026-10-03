# Milestone: Doctor Schedule Management

SerialSync — CSE 314 (Fall 2026). Sprint 2 work under Jira epic SCRUM-16.

## Team contributions

| Member | Role |
|--------|------|
| FM Maftahul Jannat | Docs, manual QA notes |
| Md Adil Hossain | Backend API, slot counts |
| Rohan Hasan Khan | Schedule UI |
| Md Abu Rafe Mostak H. Fahim | API tests |

## Deliverables

| Jira | Item | Location |
|------|------|----------|
| SCRUM-26 | Create doctor availability | `POST /api/chambers`, `POST /api/schedules`, `/dashboard/schedule` |
| SCRUM-27 | Update doctor schedule | `PATCH /api/schedules/:id` |
| SCRUM-28 | Delete availability | `DELETE /api/schedules/:id` |
| SCRUM-29 | View doctor schedule | `GET /api/schedules/doctors/:doctorId`, `/doctors/[id]/schedule` |
| SCRUM-30 | Appointment slots | `GET .../slots`, `POST /api/schedules/slots/book` |
| SCRUM-31 | Schedule conflicts | validation on create / update / activate |
| SCRUM-32 | Active / inactive status | `PATCH /api/schedules/:id/status` |

Chambers hold location info; each schedule row is a weekly pattern (days + time range + fee + how many patients per slot). Bookings are stored in Mongo for now — Redis serial queue comes later.

## Verification

```bash
cd backend && npm test
cd frontend && npm run build
```

Browser pass: [MANUAL_QA_SCHEDULE.md](./MANUAL_QA_SCHEDULE.md)
