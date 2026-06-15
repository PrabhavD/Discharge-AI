# DisDash AI (formerly Discharge AI)

AI-assisted discharge coordination for NHS ward teams. Helps clinicians see who may go home today, what is blocking discharge, who owns each action, and what documentation still needs review.

![Ward dashboard — discharge readiness overview for ward 4A](snapshots/DisdashAI-dashboard%20(7).jpeg)

**MVP complete** — ward dashboard, patient workspace, mock EPR snapshots, structured questionnaire, AI discharge plans, task/blocker tracking, draft discharge summaries, human approval, and audit logging. All data is fictional.

> **Not production-ready.** AI outputs are draft-only. Final discharge decisions require authorised human approval. Never use real patient data in development.

---

## Quick start

**Prerequisites:** Node.js 20+, Docker

```bash
npm install
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and pick a demo user from the header role switcher (Doctor, Nurse, Pharmacist, Discharge Coordinator, Admin, etc.).

Copy `.env.example` → `.env`:

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | matches `docker compose` | PostgreSQL |
| `AI_PROVIDER` | `mock` | Set `openai` + `OPENAI_API_KEY` for real LLM |
| `OPENAI_MODEL` | `gpt-4o-mini` | Optional |
| `SESSION_SECRET` | — | Required in production |

---

## Workflow

```text
EPR snapshot + questionnaire + free-text notes
        ↓
AI readiness summary / discharge plan
        ↓
Tasks, blockers, domain RAG status (RED / AMBER / GREEN)
        ↓
Draft discharge summary → clinician edit → approve document
        ↓
Final discharge plan approval → audit log
```

**Routes:** `/wards/4A` (dashboard) · `/encounters/[id]` (patient workspace)

**Workspace tabs:** Summary · Questionnaire · AI plan · Tasks & blockers · Documents · Approval · Audit log

---

## Demo patients (ward 4A)

11 fictional patients (`999…` NHS numbers). Full list seeded via `npm run db:seed`.

| Patient | Encounter | Scenario |
|---------|-----------|----------|
| Jane Demo | `enc-H001` | TTO not screened — **E2E test patient** |
| Robert Sample | `enc-H002` | Awaiting transport |
| Margaret Fictional | `enc-H003` | Awaiting OT |
| David Example | `enc-H004` | Care package pending |
| Susan – Thomas | `enc-H005`–`H010` | Consultant, family, not fit, care home, pharmacy, tomorrow |
| **Arthur Mockwell** | **`enc-H011`** | **Full mock EPR** — post-op cholecystectomy, renal mass follow-up, **POC delay** |

### Arthur Mockwell walkthrough (`enc-H011`)

1. Sign in as Discharge Coordinator or Admin.
2. Open **Mockwell, Arthur** (bed 11).
3. **Summary** — bloods, imaging, clinical notes timeline from mock EPR.
4. **Generate AI discharge plan** — RED status, care-package blocker, renal follow-up flagged.
5. Resolve blockers → **Documents** → generate & approve discharge summary.
6. **Approval** → final plan approval → check audit log.

---

## Reset database

`npm run db:seed` upserts baseline data but **does not** clear AI plans, documents, audit events, or resolved blockers.

**Full reset:**

```bash
docker compose down -v && docker compose up -d
npm run db:push && npm run db:seed
```

**Jane Demo only:** `npm run test:workflow:reset`

---

## Testing

Requires PostgreSQL running and `npm run db:seed`.

```bash
npm test                    # Vitest unit tests
npm run test:integration    # API task/blocker workflow
npm run test:e2e            # all Playwright tests
npm run test:workflow       # Jane Demo full discharge E2E
npm run test:workflow:ui    # headed, slow-mo
npm run test:unblock        # doctor RED→GREEN E2E
```

---

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind · Prisma · PostgreSQL · Vitest · Playwright

```
src/
  app/              # pages + API routes
  components/       # dashboard, workspace, approval UI
  server/
    ai/             # mock + OpenAI providers, schemas
    modules/        # encounters, plans, tasks, blockers, documents, audit
    integrations/   # EPR adapter boundary
    policy/         # approval gates
prisma/             # schema, seed, Arthur EPR data
tests/              # unit, integration, e2e
```

---

## Safety principles

**AI may:** summarise context, flag missing information, suggest tasks, draft plans and documents, show uncertainty and source evidence.

**AI must not:** decide medical fitness, submit final documentation, change medications, send external communications, or act without audit logging.

Every AI output is labelled draft-only, editable, and requires human approval before clinical use.

---

## Future roadmap

**Near term:** persist readiness summaries · per-patient reset scripts · richer OpenAI prompts · GP handover / patient advice drafts · ward metrics dashboard.

**NHS EPR integration** — replace `MockEprAdapter` ([`src/server/integrations/epr/adapter.ts`](src/server/integrations/epr/adapter.ts)) with a trust connector:

```text
Trust EPR (Epic, Cerner, System C, …)
    → FHIR R4 (Patient, Encounter, Observation, DiagnosticReport, MedicationStatement)
    → ClinicalDataSnapshot + SourceEvidence
    → Discharge AI workflow (unchanged)
```

| Phase | Goal |
|-------|------|
| v1 ingest | Read-only scheduled + on-demand snapshot refresh |
| Provenance | AI citations linked to `SourceEvidence` rows |
| Auth | NHS Smartcard / trust IdP replacing demo session |
| Safety | DCB0129 hazard log, AI feedback, SUI hooks |
| v1 export | Approved discharge summary → EPR via FHIR DocumentReference (no autonomous write-back) |
| Later | Multi-ward views · social care handoff · SLA escalation · trust-hosted LLM (Azure NHS) · pilot KPIs |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run db:push` | Apply Prisma schema |
| `npm run db:seed` | Seed mock patients |
| `npm run db:studio` | Prisma Studio |
| `npm run lint` | ESLint |

---

## Licence & warnings

Hackathon / demo project. Not NHS-approved, CE-marked, or clinically deployed. Trust DPIA, clinical safety assessment, and EPR integration agreements are required before any live patient data.

Use fictional mock data only.
