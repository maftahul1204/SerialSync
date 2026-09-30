# SerialSync API

Express 5 + MongoDB (Mongoose) — **Authentication & User Management** epic.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Start MongoDB locally, then:
npm run dev
```

API base: `http://localhost:5000`

## Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (`fullName`, `email`, `password`, optional `phone`, `role`) |
| POST | `/api/auth/login` | Login — sets HTTP-only JWT cookie |
| POST | `/api/auth/logout` | Clears session cookie |
| GET | `/api/auth/me` | Current user (cookie or `Authorization: Bearer`) |
| POST | `/api/auth/forgot-password` | Request reset (dev returns `resetToken`) |
| POST | `/api/auth/reset-password` | `{ token, password }` |
| POST | `/api/auth/change-password` | Authenticated `{ currentPassword, newPassword }` |

## Profile & RBAC

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Profile |
| PATCH | `/api/users/me` | Update `fullName`, `phone` |
| GET | `/api/users/admin/overview` | **Admin only** — RBAC check |

Roles: `patient`, `doctor`, `assistant`, `phlebotomist`, `admin`.

## Tests (QA — auth epic)

Integration tests cover registration, login, logout, password reset, RBAC, and profile (`test/auth.test.js`).

```bash
npm test
```
