# Zoo AI · Operational Intelligence — Phase 1

Six-module AI operational intelligence workspace for the St. Louis Zoo demonstration.
Anchored by one connected scenario (habitat life-support failure on LSS-204) that runs end-to-end from a single button click.

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full architecture, decisions, and step-by-step build log.

## Prerequisites

- **Node.js ≥ 20**
- **pnpm ≥ 9** (`npm i -g pnpm`)
- **Postgres** — either your own instance or a hosted one (Neon, Supabase, RDS).
  We do not require pgvector locally; embeddings live inside OIP once the real spec lands.

## First-run setup

1. **Install dependencies**
   ```
   pnpm install
   ```

2. **Configure environment**
   Copy `.env.example` → `.env` and fill in at minimum:
   ```
   DATABASE_URL="postgresql://…"
   NEXTAUTH_SECRET="…"           # openssl rand -base64 32
   ```
   Everything else (OIP / Agent Builder / ProcureChain / Dashboard OAuth credentials) is
   optional — with `USE_MOCK_ADAPTERS=true` (the default in the template) the app runs
   entirely on in-process fallbacks and still produces the full connected scenario.

3. **Migrate + seed the database**
   ```
   pnpm db:migrate       # applies prisma/migrations
   pnpm db:seed          # 6 roles, 6 users, LSS-204 asset, 90 days of telemetry, maintenance history
   pnpm corpus:ingest    # loads content/sops/*.md into document_chunks
   ```

4. **Run the app**
   ```
   pnpm dev
   ```
   Open <http://localhost:3000>. Any of the six seeded emails signs you in with no password:
   `exec@zoo.demo` · `facilities@zoo.demo` · `curator@zoo.demo` · `maintenance@zoo.demo` ·
   `governance@zoo.demo` · `staff@zoo.demo`.

## Driving the demo

Sign in as **Facilities Manager**, then press **▶ Run scenario** in the top bar.
For a step-by-step demo script see [docs/demo-runbook.md](docs/demo-runbook.md).

## Available scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (Next.js preset) |
| `pnpm test` | Vitest unit + integration tests |
| `pnpm test:e2e` | Playwright E2E tests |
| `pnpm db:migrate` / `db:seed` / `db:reset` / `db:studio` | Prisma |
| `pnpm corpus:ingest` | Load SOP markdown into Postgres |

## Six modules

1. **Home Portal** — role-based launchpad, live KPIs, alert feed. [src/app/(app)/page.tsx](src/app/(app)/page.tsx)
2. **Knowledge Assistant** — grounded Q&A with citations over the SOP corpus. [src/app/(app)/knowledge](src/app/(app)/knowledge)
3. **Facilities Intelligence** — asset telemetry, thresholds, maintenance history. [src/app/(app)/facilities](src/app/(app)/facilities)
4. **Executive Dashboard** — leadership KPIs, sparkline, value donut, ask-the-data. [src/app/(app)/executive](src/app/(app)/executive)
5. **Incident & Workflow** — kanban, AI response plan, ProcureChain PO. [src/app/(app)/incidents](src/app/(app)/incidents)
6. **Security & Governance** — RBAC matrix, immutable audit trail, SSO/MFA indicator. [src/app/(app)/security](src/app/(app)/security)

## Proprietary component integration

Each of the reused platform components (OIP, Agent Builder, ProcureChain, Dashboard) has
a small adapter under `src/server/clients/<component>/`. The **real HTTP client** talks
to your service over OAuth 2.0; a **Local fallback** does the same job in-process while
the real OpenAPI spec is pending. The factory (`index.ts`) picks whichever is available.

To point at your real service, set the OAuth triplet in `.env` and unset the mock flag:
```
USE_MOCK_ADAPTERS=false
OIP_BASE_URL=https://…
OIP_TOKEN_URL=https://…/oauth/token
OIP_CLIENT_ID=…
OIP_CLIENT_SECRET=…
```
(Same shape for `AGENT_*`, `PROCURECHAIN_*`, `DASHBOARD_*`.)

## Project structure

```
prisma/                 schema + migrations + seed
content/sops/           SOP markdown corpus (life-support, escalation, PM, pump manual)
scripts/                CLI utilities (corpus ingest)
src/
  app/                  Next.js App Router pages + route handlers
  auth.ts               NextAuth v5 config
  components/           React components (shell, home, facilities, knowledge, incident, executive, security, ui)
  hooks/                Client hooks (useZooEvents)
  lib/                  db, rbac, utils, modules, trpc client
  server/
    clients/            External-service adapters (oauth, knowledge, agent, procurement, dashboard)
    realtime/           SSE event bus
    services/           Domain services (facilities, knowledge, incidents, procurement, executive, security, audit, scenario, telemetry-simulator, alerts, authz)
    trpc/               tRPC context + init + root + routers
  types/                Ambient types
docs/                   rbac.md, demo-runbook.md
```

## What's synthetic

All data — animals, assets, sensors, documents, KPIs, and users — is illustrative and
labeled with a persistent banner across every screen. See `docs/rbac.md` for the seeded
role matrix.
