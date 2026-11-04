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

API base: `http://localhost:5050` (see `PORT` in `.env`)

Full **REST API & integration testing** reference (SRS Ch. 6–7 aligned):

- Markdown: [`docs/API_AND_TESTING.md`](../docs/API_AND_TESTING.md)
- PDF: [`SerialSync_API_and_Testing_Documentation.pdf`](../SerialSync_API_and_Testing_Documentation.pdf)

Regenerate PDF after doc changes:

```bash
.venv-pdf/bin/python scripts/generate_api_testing_pdf.py
```

## Tests

37 Supertest integration tests (`test/*.test.js`) — auth, schedules, booking, doctors, admin, queue, diagnostics, appointments/QR.

```bash
npm test
```
