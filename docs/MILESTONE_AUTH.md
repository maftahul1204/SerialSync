# Milestone: Authentication & User Management

SerialSync — CSE 314 (Fall 2026). This document maps delivered work to the Jira epic.

## Team contributions

| Member | Role |
|--------|------|
| FM Maftahul Jannat | Project management, documentation, profile UX |
| Md Adil Hossain | Backend API, authentication, RBAC |
| Rohan Hasan Khan | Authentication UI (Next.js) |
| Md Abu Rafe Mostak H. Fahim | Integration tests, client validation, QA checklist |

## Deliverables

| Jira | Item | Location |
|------|------|----------|
| SCRUM-7 / 93 | User registration | `POST /api/auth/register`, `/register` |
| SCRUM-8 / 95 | User login | `POST /api/auth/login`, `/login` |
| SCRUM-9 / 97 | User logout | `POST /api/auth/logout`, dashboard logout |
| SCRUM-10 / 99 | Password management | forgot / reset / change password API + UI |
| SCRUM-11 / 104 | RBAC | roles on `User`, middleware, admin route |
| SCRUM-12 / 106 | Profile | `GET/PATCH /api/users/me`, `/profile` |
| SCRUM-94, 96, 98, 100, 105, 107 | Test sub-tasks | `backend/test/auth.test.js`, `frontend/test/validation.test.js` |

## Verification

```bash
cd backend && npm test
cd frontend && npm test && npm run build
```

Manual browser checks: [MANUAL_QA_AUTH.md](./MANUAL_QA_AUTH.md)

## Next milestone

Multi-location scheduling, live queue (Socket.io), and diagnostics modules per SRS.
