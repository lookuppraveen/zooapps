# Zoo AI Operational Intelligence — Full-Stack Implementation Plan

> **Source concept**: [Zoo_AI_OpsIntelligence_Concept_and_UIUX.pdf](Zoo_AI_OpsIntelligence_Concept_and_UIUX.pdf)
> **Status**: Decisions locked (D1–D6) · Integration details locked (I1–I3) · Awaiting OpenAPI specs from platform teams · No code written yet
> **Owner**: Lookup IT Solutions
> **Last updated**: 2026-08-28

---

## 0. Current State & Critical Decisions Before Planning Locks

### What exists today
- [index.html](index.html) — a single self-unpacking "bundler" artifact (the interactive prototype referenced in PDF §7.4). Its content is embedded as base64 JSON inside `<script type="__bundler/template">` — **not editable as source**. It's a presentation asset, not a codebase to extend.
- [README.md](README.md) — user guide for opening the prototype.
- Concept PDF + DOCX.
- No backend, no build tooling, no package.json, no framework scaffolding.

**This means: we are not "extending" an existing app — we are building the real app for the first time, using the prototype as visual reference only.**

### Locked decisions (confirmed 2026-08-28)

| # | Decision | Locked answer | Implication |
|---|---|---|---|
| D1 | Reused platform components | **Integrate via API** (real proprietary services) | Build thin adapters that call real endpoints for AI Squad, OIP, Agent Builder, ProcureChain, Dashboard — no simulation. **Blocked until API contracts/credentials provided.** |
| D2 | Build target | **Production Phase 1 foundation** | Real migrations, no throwaway code, hardening from day one, full test coverage. |
| D3 | LLM provider | **Anthropic Claude** | Claude Sonnet 4.6 with prompt caching. Anthropic SDK is the only LLM client. |
| D4 | SSO/MFA | **Simulated login for demo** (production IdP later) | Build NextAuth Credentials provider with real JWT + role claim; design so Okta/Azure AD can swap in via provider config alone. |
| D5 | Sensor telemetry | **Scripted simulator for LSS-204** | `TelemetrySimulator` service produces deterministic DO/pressure/temp drift; real MQTT/OPC-UA ingestion is a Phase 2 concern. |
| D6 | Hosting | **Vercel** | Vercel + Neon Postgres, GitHub Actions CI, Vercel env vars for secrets. |

### Integration details (confirmed 2026-08-28)

| # | Topic | Locked answer | Implication |
|---|---|---|---|
| I1 | Deployment locality for proprietary components | **Run on localhost for now** | Adapters read base URLs from env vars (`OIP_BASE_URL=http://localhost:...`, etc.). No cross-origin/CORS concerns during dev. Vercel deployment gets the same env vars pointed at whatever URL the platform teams host on later. |
| I2 | Auth mechanism | **OAuth 2.0** (client credentials assumed for service-to-service) | Build one shared `OAuthTokenProvider` — fetches + caches + refreshes access tokens per component, injects `Authorization: Bearer <token>` on every adapter call. Env: `<COMPONENT>_CLIENT_ID`, `<COMPONENT>_CLIENT_SECRET`, `<COMPONENT>_TOKEN_URL`. |
| I3 | OpenAPI specs / endpoint list | **Will be provided** | Adapters and Zod contracts hand-drafted now against expected shapes; regenerated from real specs once received. Mock servers use the same contracts so nothing breaks on swap. |

**Still unspecified** (safe defaults applied — flag if wrong):
- **Rate limits / SLAs** — assume 10 req/s per component, 30s timeout on LLM/agent calls, 5s elsewhere. Retries: 2, exponential backoff, 5xx + network only.
- **Sandbox data isolation** — assume localhost instances start clean per boot; scenario reset endpoint idempotently restores our own DB state.

**Impact on roadmap**: All 15 steps are now **unblocked to start**. Steps 8, 10, 11, 13 will proceed against hand-drafted contracts + mock servers, then swap to real localhost endpoints when the OpenAPI specs and credentials arrive.

---

## 1. Requirements Extraction (Phase 1)

### 1.1 Business requirements
- Prove AI operational intelligence in one leadership-friendly demo.
- Reinforce trust: citations, audit trail, synthetic-data banner always visible.
- Land five proof points (secure access, grounded answers, NL analytics, workflow orchestration, measurable value).
- Position Phase 1 as foundation for the broader Zoo Management System.

### 1.2 Functional requirements (by module)

**M1 · Home Portal** — role-based landing, 4 KPIs (systems healthy, open alerts, active workflows, knowledge queries), 3×2 module launchpad, live alert feed, global AI ask-bar, one-click "Run connected scenario."

**M2 · Knowledge Assistant** — chat over indexed SOPs/manuals/policies, every answer returns citations (doc + section), suggested-question chips, "grounded on" corpus panel with index status, answers role-scoped.

**M3 · Facilities & Maintenance Intelligence** — asset registry + watchlist, live telemetry gauges (DO, pressure, temperature) with threshold bands, per-asset maintenance history, predictive flags, PM-compliance, one-click handoff to Incident.

**M4 · Executive Dashboard** — natural-language "Ask the data" box, 4 leadership KPIs (MTTR, incident volume, downtime avoided, welfare risk), trend sparkline, operational-value donut, auto-generated summaries with sourced cards.

**M5 · Incident & Workflow Assistant** — auto-created incident from Facilities alert, AI-assembled response plan timeline with citations, 4-column Kanban (To Do / In Progress / Review / Done), ProcureChain auto-drafted PO awaiting approval, human-in-the-loop confirmations.

**M6 · Security / Governance** — SSO+MFA indicator, 6 RBAC roles with role→module matrix, immutable audit trail timeline, data classification card.

### 1.3 The connected scenario (demo spine)
```
Sensor drift on LSS-204
    → threshold breach
    → alert on Home + Facilities
    → Knowledge retrieves SOP + maintenance history (2026-05-14 shaft seal replacement)
    → Incident INC-4471 opens with tasks + ProcureChain PO for replacement seal
    → Executive summary auto-generated
      (11s signal→plan, 6min containment, ~4h downtime avoided, 0 welfare escalations)
```
Every step writes audit events.

### 1.4 UI/UX constraints (locked from PDF §7)
- Teal `#0E7C86 → #0AA2B0` primary, Slate navy `#0F2942` sidebar, Blue `#2563EB` links/citations, Green/Amber/Red status only, `#F4F6F9` surface, 12px radius, soft shadows, system UI sans-serif.
- Persistent left sidebar (6 nav items with live badges), top bar (breadcrumb + global ask + Run scenario + notifications + role), **always-visible synthetic-data banner**, centered card column.
- Accessibility: strong contrast, keyboard-friendly, responsive.

### 1.5 Non-functional requirements
Grounded answers only (no hallucinations); every AI action auditable & attributable; role-scoped data; readable on projector; scenario re-runnable idempotently; deterministic-enough for live demo; sub-second UI response outside LLM calls.

### 1.6 Roles (6, from §5.6)
Executive · Facilities Manager · Curator · Maintenance Tech · Security/Governance Admin · General Staff. Full role×module matrix authored in `docs/rbac.md`.

### 1.7 Edge cases & risks
- LLM latency during live demo → prompt cache + pre-warm scenario prompts; fallback to canned responses on timeout.
- Citation hallucination → constrain retrieval to indexed corpus; reject answers with no citations.
- Scenario re-run during demo → reset endpoint that idempotently returns state to pre-scenario snapshot.
- Timezone/date drift for maintenance history (2026-05-14) → store UTC, render in America/Chicago (zoo local).
- Audit-trail volume → append-only, indexed by actor+resource+time.
- **Missing from PDF**: sensor data arrival mechanism, notification channels (SMS/email/push?), which docs to index, PO approval hierarchy, welfare-escalation policy body. Stub reasonable defaults and flag.

---

## 2. System Architecture (Phase 2)

### 2.1 High-level shape
Single **Next.js 15 App Router** monorepo (frontend + API routes), **Postgres** for structured data, **pgvector** for RAG embeddings, S3-compatible object store for source documents, lightweight in-process job runner for scenario orchestration.

**Stack**: Next.js 15 + TypeScript + Tailwind + shadcn/ui + tRPC + Prisma + Postgres/pgvector + NextAuth + Anthropic SDK.

**Rationale**: matches "enterprise-SaaS" polish target, one deploy unit, tRPC gives typed contracts without OpenAPI ceremony, shadcn lets us match PDF design tokens exactly.

### 2.2 Component adapters (real API integrations — D1 locked)
Each proprietary component is accessed through a thin adapter that calls the real service over HTTPS. The Next.js app never speaks to third-party components directly — everything routes through these adapters so we get one place to centralize auth, retries, timeouts, tracing, audit logging, and error mapping.

| Adapter | Backs onto | Contract shape |
|---|---|---|
| `KnowledgeClient` | OIP document intelligence | `ingest()`, `search(query, roleScope) → passages[]`, `answer(question, roleScope) → { text, citations[] }` |
| `AgentClient` | Agent Builder | `planIncidentResponse(alert, context) → ResponsePlan` |
| `ProcurementClient` | ProcureChain | `draftPO(item, incident) → PurchaseOrder`, `approvePO(poId, actorId)` |
| `DashboardClient` | Dashboard capability | `askData(nlQuery, roleScope) → SourcedSummary`, `kpis(scope) → Kpi[]` |
| `PortalClient` | AI Squad portal | `session()`, `roleContext()` — used only for identity federation if needed |

**Adapter conventions** (applied uniformly):
- Constructor takes `baseUrl` + `OAuthTokenProvider` (shared, one per component) from env.
- Auth: OAuth 2.0 client credentials — token fetched from `<COMPONENT>_TOKEN_URL`, cached in memory until expiry - 60s, auto-refreshed on 401.
- Every call wrapped in an `AuditedService` boundary that logs request/response metadata (never full bodies).
- Timeouts: 5s default, 30s for LLM/agent calls. Retries: 2 attempts, exponential backoff, only on 5xx and network errors.
- Errors mapped to internal `AppError` taxonomy so UI/tRPC handling is uniform regardless of upstream.
- Requests carry `X-Zoo-Actor-Id` + `X-Zoo-Role` headers for upstream audit correlation.
- **Mock server** (`msw-node` or a tiny Fastify stub) implements the same contracts for local dev + CI when real endpoints aren't reachable or OpenAPI specs are still pending.

### 2.3 Data flow — connected scenario
```
TelemetrySimulator ──► /api/telemetry/tick
        │                   │
        │             evaluateThresholds()
        │                   ▼
        │             AlertService.raise()  ─────► WebSocket/SSE broadcast
        │                                              │
        │                                    Home + Facilities live-update
        ▼
IncidentService.createFromAlert()
        │
        ├─► KnowledgeService.answer(SOP query)  ─── citations logged
        ├─► KnowledgeService.getAssetHistory()
        ├─► AgentService.planIncidentResponse()
        └─► ProcurementService.draftPO()
                                             │
                                             ▼
                                       AuditService.append() (every step)
                                             │
                                             ▼
                             DashboardService.summarize(incident)
```

### 2.4 AuthN/AuthZ
NextAuth with Credentials provider (demo) + role claim in JWT. Middleware guards all API routes; RBAC enforced in service layer via `ctx.canAccess(resource, action)`. Same role gate applied to Knowledge answers (filter passages by role before LLM sees them — prevents leakage through the LLM).

### 2.5 Real-time
**Server-Sent Events** for alert feed and scenario progress. Simpler than WebSockets, sufficient for one-way pushes, works through Vercel edges.

---

## 3. Database Design (Phase 3)

Postgres via Prisma. Draft schema (final DDL after approval):

### Core entities
- `User` — id, email, name, roleId, mfaEnabled, createdAt
- `Role` — id, key (executive|facilities_mgr|curator|maintenance|governance|staff), name
- `RoleModuleAccess` — roleId, moduleKey, canRead, canAct (materializes §5.6 matrix)

### Facilities
- `Asset` — id, code (LSS-204), name, category, habitatId, thresholds JSONB, healthStatus, lastPmAt, pmComplianceDue
- `Habitat` — id, name (River's Edge), area
- `SensorReading` — id, assetId, metric (do|pressure|temp), value, unit, capturedAt (btree index on `(assetId, capturedAt DESC)`)
- `MaintenanceRecord` — id, assetId, performedAt, action, technicianId, notes, partsReplaced JSONB

### Knowledge (RAG)
- `Document` — id, title, source, roleScope, indexedAt, indexStatus
- `DocumentChunk` — id, documentId, section, ordinal, text, embedding vector(1536), roleScope
  - Index: `USING hnsw (embedding vector_cosine_ops)`

### Incidents / Workflow
- `Incident` — id, code (INC-4471), assetId, priority, status, openedAt, closedAt, mttr, downtimeAvoidedHrs
- `IncidentTask` — id, incidentId, title, ownerId, column (todo|in_progress|review|done), order, aiGenerated
- `ResponsePlanStep` — id, incidentId, ordinal, text, citationIds JSONB, generatedAt

### Procurement
- `PurchaseOrder` — id, incidentId, vendor, itemDescription, qty, unitCost, status (draft|pending_approval|approved|sent), approverId
- `POApproval` — id, poId, actorId, decision, decidedAt

### Governance
- `AuditEvent` — id, actorId, actorRole, action, resourceType, resourceId, meta JSONB, occurredAt
  - Indexes: `(occurredAt DESC)`, `(resourceType, resourceId)`, `(actorId, occurredAt DESC)`
  - Append-only (no update/delete grants)
- `AiInteraction` — id, kind (retrieval|answer|plan|summary), promptHash, model, tokensIn, tokensOut, citations JSONB, userId, createdAt

### Analytics (materialized for dashboard)
- `KpiSnapshot` — id, kpiKey, value, capturedAt (nightly + on-demand refresh)

### Validation rules
Zod at API boundary; Postgres `CHECK` constraints for enums; `NOT NULL` everywhere role-scoping matters; foreign keys with `ON DELETE RESTRICT` for anything an audit event references.

---

## 4. Frontend Plan (Phase 4)

### 4.1 Route map (Next.js App Router)
```
/(auth)/login
/(app)/                        → Home Portal (M1)
/(app)/knowledge               → Knowledge Assistant (M2)
/(app)/facilities              → Facilities Intelligence (M3)
/(app)/facilities/[assetCode]  → Asset detail (LSS-204 focus card)
/(app)/executive               → Executive Dashboard (M4)
/(app)/incidents               → Incident list
/(app)/incidents/[code]        → Incident detail (kanban + plan) (M5)
/(app)/security                → Security & Governance (M6)
/(app)/security/audit          → Audit trail detail
```

### 4.2 Shell components (built once, reused everywhere)
`AppShell`, `Sidebar` (with live badges via SSE), `TopBar` (breadcrumb + `GlobalAskBar` + `RunScenarioButton` + `NotificationsBell` + `RoleMenu`), `SyntheticDataBanner`, `PageContainer`.

### 4.3 Design system module (`components/ui/` via shadcn, themed)
`Card`, `KpiTile`, `StatusChip` (green/amber/red only), `CitationChip`, `ModuleTile`, `Kanban`, `Timeline`, `Gauge` (DO/pressure/temp), `SparklineCard`, `DonutCard`, `ChatBubble`, `GroundedAnswerCard`, `ComponentReuseChip`. Tokens in `tailwind.config.ts` mirror PDF §7.2 exactly.

### 4.4 State management
- Server state: **TanStack Query** over tRPC (cache, background revalidation).
- Real-time: SSE subscription hook `useLiveAlerts()` that invalidates relevant queries.
- Local UI state: `useState`/`useReducer`; no Redux/Zustand for Phase 1 — overkill.
- Forms: **react-hook-form + Zod** (shared Zod schemas with backend).

### 4.5 Responsive strategy
Desktop-first (leadership demo runs on projector), graceful ≥1024px → tablet stacking → mobile single-column cards, sidebar collapses to top drawer.

### 4.6 Accessibility
shadcn primitives are Radix-based (a11y-correct). Enforce: focus rings visible, `aria-live=polite` on alert feed, `role=status` on gauges, color-blind-safe status palette variant.

---

## 5. Backend Plan (Phase 5)

### 5.1 API surface (tRPC routers)
- `auth.login`, `auth.session`, `auth.switchRole` (demo-only)
- `portal.overview` (KPIs + alerts + queries count)
- `knowledge.ask`, `knowledge.corpusStatus`, `knowledge.suggestions`
- `facilities.assets`, `facilities.asset(code)`, `facilities.telemetry(code, range)`, `facilities.handoffToIncident`
- `executive.kpis`, `executive.askData`, `executive.summarize(incidentId)`, `executive.valueOverview`
- `incidents.list`, `incidents.get(code)`, `incidents.createFromAlert`, `incidents.tasks.move`, `incidents.tasks.confirm`
- `procurement.drafts`, `procurement.approve`, `procurement.reject`
- `security.roles`, `security.accessMatrix`, `security.auditTrail(filters)`
- `scenario.run`, `scenario.reset`, `scenario.state`

### 5.2 Service layer
`AuditedService` base wraps every method to write an `AuditEvent`. Services: `KnowledgeService`, `FacilitiesService`, `IncidentService`, `ProcurementService`, `DashboardService`, `ScenarioOrchestrator`, `TelemetrySimulator`, `AuthzService`.

### 5.3 Knowledge answering (via OIP KnowledgeClient)
Because D1 locks OIP as the real backend, RAG mechanics (chunking, embeddings, vector search) live inside OIP — **we do not reimplement them locally**. Our `KnowledgeService` responsibilities become:

1. Forward `answer(question, roleScope)` to OIP; scope is enforced both by the JWT sent to OIP and by our own pre-flight `AuthzService` check.
2. Validate the returned response shape (Zod) — every claim must carry at least one citation ID.
3. Reject / retry-once responses with zero citations (surface "insufficient grounding" to UI).
4. Persist `AiInteraction` row (kind, model, tokens, citations, userId) for our own audit trail — independent of OIP's internal logs.
5. Cache identical questions per user for 60s (reduces demo cost + latency).

If OIP does not itself route to Claude, we may still call Claude directly for the Executive Dashboard's `askData` NL analytics (that lives behind `DashboardClient` — clarify with the Dashboard team whether NL analytics is server-side or expected client-side).

### 5.4 Scenario orchestrator
`ScenarioOrchestrator.run()` executes deterministic steps with realistic timing, each awaiting UI ack via SSE for demo pacing control. `reset()` truncates scenario-scoped rows and re-seeds.

### 5.5 Error handling & security
Central `AppError` taxonomy → tRPC error formatter → typed client toasts. Rate-limit `knowledge.ask` and `executive.askData` per user. Input validation with Zod at every boundary. SSRF-safe fetches. Content-Security-Policy headers. Prisma parametrized only. Audit access denials.

---

## 6. Implementation Roadmap (Phase 6)

Rough sizing: **~4–6 weeks single dev, ~2.5–3 weeks pair**. Each step lists concrete file changes.

**Complexity legend**: S = ≤1 day · M = 2–4 days · L = 5–8 days.

### Step 1 · Repo & tooling foundation *(S)*
- Init Next.js 15 + TS + Tailwind + ESLint/Prettier + Vitest + Playwright.
- **Files**: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`.
- **Outcome**: `pnpm dev` boots a blank shell.

### Step 2 · Design tokens & shell *(M)*
- Encode PDF §7.2 tokens; build `AppShell`, `Sidebar`, `TopBar`, `SyntheticDataBanner`, `PageContainer`.
- **Files**: `styles/globals.css`, `components/shell/*`, `components/ui/*` (shadcn init + themed).
- **Outcome**: navigable empty six-module skeleton matching visual language.

### Step 3 · Database + Prisma + seeds *(M)*
- Prisma schema (§3), initial migration, seed script for roles, users, LSS-204 asset, one habitat, three months of telemetry, one prior maintenance record (2026-05-14 shaft seal).
- **Files**: `prisma/schema.prisma`, `prisma/migrations/*`, `prisma/seed.ts`, `docs/rbac.md`.
- **Outcome**: `pnpm db:seed` produces demo-ready DB.

### Step 4 · Auth + RBAC *(M)*
- NextAuth credentials provider, JWT role claim, middleware guard, role-switcher for demo, `AuthzService`, access matrix.
- **Files**: `app/(auth)/login/page.tsx`, `lib/auth/*`, `middleware.ts`, `server/services/authz.ts`.
- **Outcome**: login → role-appropriate sidebar; unauthorized routes 403.

### Step 5 · Audit service + tRPC scaffolding *(S)*
- `AuditedService` base, tRPC root router, error formatter, SSE broadcaster.
- **Files**: `server/trpc/*`, `server/services/audit.ts`, `server/realtime/sse.ts`.
- **Outcome**: every service call auto-writes `AuditEvent`; UI can subscribe.

### Step 6 · Home Portal (M1) *(M)*
- KPI tiles, module launchpad, live alert feed (SSE), Run-scenario button.
- **Files**: `app/(app)/page.tsx`, `components/home/*`, `server/routers/portal.ts`.
- **Outcome**: home renders live KPIs; button visible but no-op until Step 12.

### Step 7 · Facilities Intelligence (M3) + Telemetry Simulator *(L)*
- Asset registry, watchlist, focus card with 3 gauges, maintenance history, threshold evaluation, alert raise-on-breach.
- **Files**: `app/(app)/facilities/*`, `server/routers/facilities.ts`, `server/services/facilities.ts`, `server/services/telemetry-simulator.ts`, `components/facilities/{Gauge,Watchlist,AssetFocusCard}.tsx`.
- **Outcome**: LSS-204 gauges live-update; crossing threshold raises alert on Home.

### Step 8 · OIP KnowledgeClient adapter + corpus setup *(M)* — **needs API contract**
- Build `KnowledgeClient` (typed adapter over OIP REST), Zod response schemas, citation validator, `AiInteraction` persistence, per-user cache.
- Upload the synthetic SOP corpus (life-support SOP, escalation policy, pump manual excerpt, PM policy) into OIP; store their OIP document IDs in our `Document` table for cross-reference.
- Mock server for CI (`tests/mocks/oip-mock.ts`) implementing the same contract.
- **Files**: `server/clients/oip/*`, `server/services/knowledge.ts`, `content/sops/*.md`, `scripts/upload-corpus.ts`, `tests/mocks/oip-mock.ts`.
- **Outcome**: `knowledge.ask()` returns real cited answers from OIP; corpus panel shows indexed docs; CI runs green without OIP reachable.

### Step 9 · Knowledge Assistant UI (M2) *(M)*
- Chat thread, `GroundedAnswerCard` with citations strip, suggestion chips, corpus rail, role-scoped answers.
- **Files**: `app/(app)/knowledge/*`, `components/knowledge/*`, `server/routers/knowledge.ts`.
- **Outcome**: users can ask questions and get cited answers.

### Step 10 · Incident + Workflow (M5) + AgentClient adapter *(L)* — **needs API contract**
- Incident model, Kanban board (drag), response-plan timeline, `AgentClient` adapter (Agent Builder), task confirmation flow, mock server for CI.
- **Files**: `app/(app)/incidents/*`, `components/incident/{Kanban,PlanTimeline}.tsx`, `server/routers/incidents.ts`, `server/services/incident.ts`, `server/clients/agent-builder/*`, `tests/mocks/agent-mock.ts`.
- **Outcome**: alert → incident with tasks + plan + citations from Agent Builder.

### Step 11 · ProcureChain adapter *(M)* — **needs API contract**
- `ProcurementClient` adapter (ProcureChain), draft-PO flow, approval flow, PO card inside incident detail, mock server for CI.
- **Files**: `components/procurement/*`, `server/routers/procurement.ts`, `server/services/procurement.ts`, `server/clients/procurechain/*`, `tests/mocks/procurement-mock.ts`.
- **Outcome**: incident auto-drafts PO for replacement seal via ProcureChain; approver signs off.

### Step 12 · Scenario Orchestrator *(M)*
- End-to-end scripted flow: telemetry drift → alert → knowledge retrievals → incident → PO → summary. Reset endpoint. SSE-driven progress stepper.
- **Files**: `server/services/scenario.ts`, `components/scenario/RunButton.tsx`, `app/api/scenario/*`.
- **Outcome**: "▶ Run connected scenario" walks all six modules end-to-end in ~90 s.

### Step 13 · Executive Dashboard (M4) + DashboardClient adapter *(M)* — **needs API contract**
- KPIs, sparkline, value donut, `Ask the data` NL analytics via `DashboardClient`, auto-generated incident summary (may call Claude directly if Dashboard component doesn't own NL analytics — TBD with Dashboard team).
- **Files**: `app/(app)/executive/*`, `components/executive/*`, `server/routers/executive.ts`, `server/services/dashboard.ts`, `server/clients/dashboard/*`, `tests/mocks/dashboard-mock.ts`.
- **Outcome**: post-scenario, exec view shows summary + measurable value figures from §9.

### Step 14 · Security & Governance (M6) *(S)*
- Role×module matrix table, audit-trail timeline, data classification card, SSO/MFA indicators.
- **Files**: `app/(app)/security/*`, `components/security/*`, `server/routers/security.ts`.
- **Outcome**: audit trail mirrors scenario steps; matrix visible.

### Step 15 · Polish, a11y, demo hardening *(M)*
- Loading skeletons, error boundaries, keyboard nav pass, projector-readable font sizes, prompt-cache warmup, pre-rendered fallback answers for LLM outages, README overhaul.
- **Files**: `components/ui/Skeleton.tsx`, `app/error.tsx`, `docs/demo-runbook.md`.
- **Outcome**: reliable live demo.

---

## 7. Testing Strategy (Phase 7)

- **Unit (Vitest)** — services (Authz, Facilities threshold logic, Knowledge citation validator, Scenario orchestrator state machine), Zod schemas, RBAC matrix.
- **Contract (Vitest + tRPC msw)** — every router: happy path, unauth, forbidden, validation error.
- **Integration (Vitest + Testcontainers Postgres)** — RAG ingest→retrieve→cite loop with a tiny fixed corpus; audit-event write on every mutation.
- **E2E (Playwright)** — three journeys:
  1. Login as Facilities Manager → run scenario → verify incident + PO created + summary appears.
  2. Role-scoping negative test (Staff cannot see Governance module).
  3. Reset scenario returns clean state.
- **Visual regression (Playwright snapshots)** — Home, Knowledge answer card, Facilities focus card, Incident kanban.
- **LLM eval harness** — 20 canned questions with expected citation set; CI asserts ≥95% citation-accuracy.
- **Coverage target**: 80% lines on services, 60% overall.

---

## 8. Deployment (Phase 8)

- **Environments**: `local` (docker-compose Postgres+pgvector), `preview` (Vercel per-PR + Neon branch DB), `demo` (Vercel prod + dedicated Neon), optional `prod` later.
- **Build**: `pnpm build` → Next.js standalone; Prisma migrations via `prisma migrate deploy` in a pre-deploy step.
- **CI/CD (GitHub Actions)** — lint → typecheck → unit → integration (Testcontainers) → build → deploy preview → E2E against preview → promote on main merge.
- **Secrets**: `.env` with `DATABASE_URL`, `NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY`, and OAuth triplets per component: `OIP_BASE_URL`/`OIP_TOKEN_URL`/`OIP_CLIENT_ID`/`OIP_CLIENT_SECRET` (repeat for `AGENT_*`, `PROCURECHAIN_*`, `DASHBOARD_*`, `PORTAL_*`). Vercel env vars in prod.
- **Observability**: structured JSON logs (pino), Sentry for errors, LLM interactions logged to `AiInteraction` table for review.
- **Backup**: nightly Neon PITR; document corpus in S3 with versioning.
- **Production considerations for later**: real IdP (Okta), MQTT ingestor for real sensors, dedicated worker for orchestration, LangSmith/Langfuse for LLM tracing, CSP + WAF, SOC2-lite audit-log retention (7 yr).

---

## 9. Risks & Missing Requirements

1. **Component reuse ambiguity** (D1) — biggest scope lever.
2. **No SOP corpus provided** — draft synthetic SOPs (life-support, escalation, PM policy, pump manual excerpt) for review.
3. **PO approval hierarchy undefined** — assuming single approver = Facilities Manager unless told.
4. **Notification channels** (email/SMS/push) unspecified — Phase 1 shows in-app notifications only.
5. **Value figures in §9** are illustrative — seed exactly as shown for demo; production would derive from telemetry.
6. **LLM cost/latency for live demo** — mitigate with prompt cache + pre-warm + canned fallback.
7. **Timezone** — assuming America/Chicago (St. Louis).
8. **Design source of truth** — the bundled `index.html` prototype is a rendered artifact, not editable source. Match it by-eye from PDF tokens; a screenshot walkthrough or original design file would tighten alignment.

---

## 10. Files & Folders to Be Created

```
prisma/
  schema.prisma  migrations/  seed.ts
content/sops/{life-support-sop,escalation-policy,pm-policy,pump-manual}.md
scripts/{ingest.ts,reset-demo.ts}
src/app/
  (auth)/login/page.tsx
  (app)/{layout.tsx,page.tsx,knowledge,facilities,executive,incidents,security}/**
  api/{auth,scenario,telemetry,sse}/**
  error.tsx  not-found.tsx
src/components/
  shell/{AppShell,Sidebar,TopBar,SyntheticDataBanner,GlobalAskBar,RunScenarioButton}.tsx
  ui/*                         (shadcn themed)
  home/{KpiStrip,ModuleLaunchpad,AlertFeed}.tsx
  knowledge/{Chat,GroundedAnswerCard,CorpusRail,SuggestionChips}.tsx
  facilities/{Gauge,AssetFocusCard,Watchlist,MaintHistory}.tsx
  executive/{AskData,KpiStrip,Sparkline,ValueDonut,SummaryCard}.tsx
  incident/{IncidentBanner,Kanban,PlanTimeline,POCard}.tsx
  security/{RoleMatrix,AuditTimeline,ClassificationCard}.tsx
  scenario/{ProgressStepper,FlowMap}.tsx
src/server/
  trpc/{root,context,middleware}.ts
  routers/{portal,knowledge,facilities,executive,incidents,procurement,security,scenario}.ts
  services/{audit,authz,knowledge,facilities,agent,procurement,dashboard,scenario,telemetry-simulator}.ts
  realtime/sse.ts
src/lib/{auth,rbac,zod-schemas,llm-client,embeddings,citation-validator}.ts
tests/{unit,integration,e2e}/**
docs/{rbac.md,demo-runbook.md,architecture.md}
.github/workflows/ci.yml
docker-compose.yml  Dockerfile
tailwind.config.ts  next.config.ts  tsconfig.json  package.json  .env.example
```

**Files touched**: `README.md` (rewrite for the real app).

---

## 11. Approval Checklist (before code begins)

- [x] Answer **D1–D6** in §0 — **locked 2026-08-28** (D1 API integration · D2 production · D3 Claude · D4 simulated login · D5 scripted telemetry · D6 Vercel).
- [x] Confirm the **Next.js + Postgres + Claude** stack.
- [x] Integration details **I1–I3** locked — **2026-08-28** (localhost dev · OAuth 2.0 · OpenAPI specs to be provided).
- [ ] Confirm the **15-step roadmap** or reorder/cut.
- [ ] Provide **OpenAPI specs + OAuth credentials** for OIP, Agent Builder, ProcureChain, Dashboard, AI Squad (when ready — non-blocking, adapters run against mocks meanwhile).
- [ ] Add any additional requirements not in the PDF (notification channels, PO approval chain, specific SOP content, additional roles).

**All 15 steps unblocked.** Adapter steps (8, 10, 11, 13) will build against hand-drafted contracts + mock servers first, then swap to real localhost endpoints once OpenAPI specs and credentials land — a config-only swap.

Once you confirm the roadmap, I'll start at **Step 1 (repo scaffold)** and check in after each step.
