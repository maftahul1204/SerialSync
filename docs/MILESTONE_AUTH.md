# Milestone: Authentication & User Management

SerialSync — CSE 314 (Fall 2026). This document maps delivered work to the Jira epic.

## Team

| Member | Role | Branch |
|--------|------|--------|
| FM Maftahul Jannat | Project Manager & docs | `jannat` |
| Md Adil Hossain | Team Lead, backend API | `adil` |
| Rohan Hasan Khan | Frontend auth UI | `rohan` |
| Md Abu Rafe Mostak H. Fahim | QA, API tests | `fahim` |

## Deliverables

| Jira | Item | Location |
|------|------|----------|
| SCRUM-7 / 93 | User registration | `POST /api/auth/register`, `/register` |
| SCRUM-8 / 95 | User login | `POST /api/auth/login`, `/login` |
| SCRUM-9 / 97 | User logout | `POST /api/auth/logout`, dashboard logout |
| SCRUM-10 / 99 | Password management | forgot / reset / change password API + UI |
| SCRUM-11 / 104 | RBAC | roles on `User`, middleware, admin route |
| SCRUM-12 / 106 | Profile | `GET/PATCH /api/users/me`, `/profile` |
| SCRUM-94, 96, 98, 100, 105, 107 | Test sub-tasks | `backend/test/auth.test.js` |

## Verification

```bash
cd backend && npm test
cd frontend && npm run build
```

Manual: run MongoDB, `npm run dev` in `backend` and `frontend`, register → dashboard → profile → logout.

## Next milestone

Multi-location scheduling, live queue (Socket.io), and diagnostics modules per SRS.
