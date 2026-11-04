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

## Features

Multi-location doctor schedules and search, atomic serial booking with QR pass, live queue (Socket.io + Redis) with
walk-in `#11B`, delay broadcasts and no-show undo, home diagnostics with signed PDF reports (HMAC links) and result
trends, family care (book for a family member), in-app notifications with an SMS gateway abstraction, doctor
day itinerary and end-of-day summary, admin doctor approval, test catalogue management and audit log.

## Run everything with Docker

```bash
cp .env.example .env        # set JWT_SECRET and REPORT_HMAC_SECRET
docker compose up --build   # web http://localhost:3000, API http://localhost:5050
```

Production hardening included: helmet, rate limiting, request logging, readiness probe (`/api/ready`),
non-root containers, health checks and a GitHub Actions CI pipeline (`.github/workflows/ci.yml`).

## Quick start (development)

**Prerequisites:** Node.js 20+, MongoDB running locally (or Atlas URI in `backend/.env`).

```bash
# API
cd backend
npm install
cp .env.example .env
npm run dev          # http://localhost:5050

# Web (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

Backend `CLIENT_URL` should match the frontend origin (`http://localhost:3000`). Frontend `NEXT_PUBLIC_API_URL` should point to the API (`http://localhost:5050`).

Seed test users, schedules, and diagnostic catalog:

```bash
cd backend && npm run seed:test-users
```

## SRS feature coverage

Full project (auth, schedules, booking, **live queue**, **home diagnostics**, admin).  
See [docs/MILESTONE_FULL_SRS.md](./docs/MILESTONE_FULL_SRS.md). **UI / SRS figures:** [Figma file](https://www.figma.com/design/vR4DaYPMmYq2EMyNGTOyx1/Untitled?node-id=4-4688), [DESIGN.md](./docs/DESIGN.md), [SRS_GUI_FIGURES.md](./docs/SRS_GUI_FIGURES.md). Earlier milestones: [booking](./docs/MILESTONE_BOOKING.md), [schedule](./docs/MILESTONE_SCHEDULE.md), [auth](./docs/MILESTONE_AUTH.md).

| Layer | Docs |
|-------|------|
| API | [backend/README.md](./backend/README.md) |
| Web | [frontend/README.md](./frontend/README.md) |

## License

MIT — see [LICENSE](./LICENSE).
