# Discharge AI

AI-assisted discharge coordination for NHS ward teams.

## Quick start

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies
npm install

# Setup database
npm run db:push
npm run db:seed

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Select a demo user from the header role switcher.

## Environment

Copy `.env.example` to `.env`. Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `AI_PROVIDER` — `mock` (default) or `openai`
- `OPENAI_API_KEY` — required only if `AI_PROVIDER=openai`

## Tests

```bash
npm test                    # all unit tests
npm run test:integration    # task/blocker resolve workflow (API, fast)
npm run test:e2e            # all Playwright tests
```

### Full discharge workflow (Jane Demo)

Idempotent end-to-end test for patient **Jane Demo** (`enc-H001`): questionnaire → AI plan → resolve tasks/blockers → approve summary → final approval.

Prerequisites: `docker compose up -d`, `npm run db:seed`, database reachable via `.env`.

```bash
npm run test:workflow:reset   # reset Jane Demo to seed baseline (optional)
npm run test:integration      # API: task/blocker PATCH + checklist + status recompute
npm run test:workflow         # full discharge E2E (admin role)
npm run test:workflow:ui      # watch workflow in browser (headed, slow-mo)
```

The UI run opens Chromium and walks through each tab so you can observe task/blocker resolution and final approval on screen.

### Doctor unblocking workflow

Focused E2E from a **doctor's** perspective: ward dashboard → patient workspace → resolve all blockers → verify RED → GREEN status transition on the patient header AND on the ward dashboard, plus audit log entries. Also covers the failure-rollback path (PATCH fails → optimistic UI rolls back + error banner appears).

```bash
npm run test:workflow:reset   # optional reset
npm run test:unblock          # headless doctor blocker-clear E2E
npm run test:unblock:ui       # watch doctor flow in browser (headed, slow-mo)
```

## Safety notice

AI outputs are draft-only. Final discharge decisions require authorised human clinician approval. Use fictional mock data only.
