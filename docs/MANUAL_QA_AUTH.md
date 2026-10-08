# Manual QA — Authentication UI

Checklist for browser testing (QA). Run backend and frontend dev servers first.

| # | Steps | Expected |
|---|--------|----------|
| 1 | Open `/register`, submit empty form | Inline validation messages before API call |
| 2 | Register with valid data | Redirect to `/dashboard`, name shown |
| 3 | Log out, `/login` with wrong password | Error banner, stay on login |
| 4 | Log in with correct credentials | Dashboard loads |
| 5 | Open `/profile`, change phone, save | Success message, values persist after refresh |
| 6 | `/forgot-password` with registered email | Success message; dev token link if API in development |
| 7 | Complete reset flow with token | Can log in with new password |
| 8 | Visit `/dashboard` without cookie | Redirect to `/login` |
| 9 | `/login` on phone width and on desktop (`lg`) | Role grid + form usable; desktop shows trust panel on the left |

Automated API coverage: `cd backend && npm test`  
Client validation unit tests: `cd frontend && npm test`
