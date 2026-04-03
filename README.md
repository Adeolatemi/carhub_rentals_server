# CarHub Server (backend)

This folder contains a minimal scaffold for the backend API (TypeScript + Express + Prisma).

Quick start (from `server/`):

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init --preview-feature
npm run dev
```

Notes:
- By default the Prisma datasource uses SQLite for local development (`DATABASE_URL` in `.env`).
- Replace with PostgreSQL or another DB for production and update `DATABASE_URL`.

Environment variables to set (see `.env.example`):
- `SENDGRID_API_KEY`, `EMAIL_FROM`
- `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
- `MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY`, `WEBHOOK_BASE`
- `SMILEID_API_KEY`
