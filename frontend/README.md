# SerialSync Web

Next.js 15 + React 19 + Tailwind — authentication UI for the user management epic.

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API defaults to `http://localhost:5000` (`NEXT_PUBLIC_API_URL`).

## Routes

| Path | Purpose |
|------|---------|
| `/login` | Sign in |
| `/register` | Patient registration |
| `/forgot-password` | Request password reset |
| `/reset-password` | Set new password with token |
| `/dashboard` | Post-login home (protected) |
| `/profile` | Edit name and phone |

Cookies from the API are sent with `credentials: 'include'`.
