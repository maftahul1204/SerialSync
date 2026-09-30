# SerialSync

Multi-location doctor appointment booking and real-time queue tracker (**MERN** + **Next.js**).  
**University of Asia Pacific** — CSE 314 Software Engineering Lab.

SerialSync reduces clinic waiting uncertainty through online serial booking, live queue visibility, and (in later milestones) home diagnostic workflows.

## Team

| Name | GitHub | Role |
|------|--------|------|
| FM Maftahul Jannat | [maftahul1204](https://github.com/maftahul1204) | Project manager & documentation |
| Md Adil Hossain | [Adil1109](https://github.com/Adil1109) | Team lead, backend architecture |
| Rohan Hasan Khan | [Rohan108](https://github.com/Rohan108) | Frontend development |
| Md Abu Rafe Mostak H. Fahim | [Fahim59-UAP](https://github.com/Fahim59-UAP) | QA & automated testing |

Repository: [github.com/maftahul1204/SerialSync](https://github.com/maftahul1204/SerialSync)

## Project structure

```
SerialSync/
  backend/     Express 5 + MongoDB — REST API
  frontend/    Next.js 15 + Tailwind — web app
  docs/        Milestone notes and traceability
```

## Quick start (development)

**Prerequisites:** Node.js 20+, MongoDB running locally (or Atlas URI in `backend/.env`).

```bash
# API
cd backend
npm install
cp .env.example .env
npm run dev          # http://localhost:5000

# Web (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

Backend `CLIENT_URL` should match the frontend origin (`http://localhost:3000`). Frontend `NEXT_PUBLIC_API_URL` should point to the API (`http://localhost:5000`).

## Current milestone — Authentication & user management

Completed scope: registration, login, logout, password reset, RBAC, profile.  
See **[docs/MILESTONE_AUTH.md](./docs/MILESTONE_AUTH.md)** for requirement mapping and test commands.

| Layer | Docs |
|-------|------|
| API | [backend/README.md](./backend/README.md) |
| Web | [frontend/README.md](./frontend/README.md) |

## License

MIT — see [LICENSE](./LICENSE).
