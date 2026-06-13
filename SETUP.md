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
npm test
npm run test:e2e
```

## Safety notice

AI outputs are draft-only. Final discharge decisions require authorised human clinician approval. Use fictional mock data only.
