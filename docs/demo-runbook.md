# Demo Runbook — Zoo AI Operational Intelligence

**Target duration**: 5–7 minutes · **Audience**: Zoo leadership · **Persona**: Facilities Manager

## Before you start

1. `pnpm db:reset` then `pnpm db:seed` then `pnpm corpus:ingest` — clean DB, corpus loaded.
2. `pnpm build && pnpm start` (production build is snappier than dev; less to explain).
3. Open <http://localhost:3000>, sign in as `facilities@zoo.demo` (Facilities Manager).
4. Have a second browser window ready as `staff@zoo.demo` for the RBAC beat.
5. Confirm the tRPC + SSE dots in the sidebar footer are green.

## The 7 beats

### 1 · Trust from the first screen (30 s)

Land on the **Home Portal**. Point out:
- The persistent **synthetic-data banner** — trust as UI.
- The **role** in the top bar — currently signed in as Facilities Manager.
- Four KPI tiles reading live from Supabase; all green because nothing is happening.

### 2 · Governance underneath everything (45 s)

Sidebar → **Security & Governance**. Point out:
- **Role×module matrix**: six roles, six modules, per-cell R/RW/— from the seeded matrix.
- **Immutable audit trail**: every action taken so far is here — sign-in, page loads,
  simulator interactions. Filter by "scenario" to preview what's coming.
- **SSO+MFA card** + **Synthetic (labeled) data classification** — the shape a real
  deployment ships with.

### 3 · Facilities — the origin of the story (45 s)

Sidebar → **Facilities**. Land on LSS-204's focus card. Point out:
- Three live gauges — DO, pressure, temperature — with green safe-bands.
- Maintenance history table below — a **2026-05-14 shaft-seal replacement** with notes.
  Foreshadow: "That's going to matter in a minute."
- Asset watchlist on the right, colour-coded status.

### 4 · The single button (30 s)

Return to the top bar. Point to **▶ Run scenario**. Say: *"One button. Watch every module."*
Click it.

### 5 · Watch the environment react — 15 seconds live (2 min)

The stepper appears at the top of the shell. Narrate as it goes:

- **Step 1 · Sensor drift on LSS-204** — pop to the Facilities tab. Gauges are drifting.
- **Step 2 · Critical threshold breach** — DO gauge turns red; the sidebar `Incidents`
  badge lights up; the Home Alert Feed populates (open in a second tab if you want the
  audience to see both).
- **Step 3 · Retrieving procedure + maintenance history** — sidebar → **Knowledge Assistant**.
  Show the corpus rail: 4 SOPs, 20 chunks. This is what the AI just consulted.
- **Step 4 · Opening incident, plan + PO** — click the incident link that appears in the
  stepper. Point out:
  - The **AI response plan** on the right, three numbered steps, each with a citation
    chip pointing to the exact SOP section ("Step 1 — Engage backup pump LSS-204B").
  - The **kanban board** with 5 tasks distributed across columns.
  - The **PO card** below: `AquaCore Systems · Shaft seal kit · $325.00 · pending
    approval` — auto-drafted by ProcureChain because the SOP identified the failure
    mode.
- **Step 5 · Complete — leadership summary ready.**

### 6 · The leadership view (60 s)

Sidebar → **Executive Dashboard**. Point out:
- KPIs updated live: **MTTR 2.4 hrs (▼38%)**, **Downtime avoided 31 hrs · ~$47k**,
  **0 welfare escalations**.
- Below: an **auto-generated leadership summary** for the just-created incident, with
  metrics (time to containment, plan-steps grounded, PO value) and sources
  (`incident:INC-####`, `audit:PC-#####`). *"Nobody wrote this. The environment did."*
- **Ask the data** — type `How much downtime did we avoid this month?` — get a
  sourced answer in one line.

### 7 · The trust close (60 s)

Return to **Security & Governance** → audit trail. Filter by "scenario" then by
"knowledge". Every AI retrieval, every task move, every PO draft is there — timestamped,
role-attributed, immutable.

Then, in the second browser window (`staff@zoo.demo`):
- Sidebar shows **fewer modules** — Executive, Incidents, Security are gone.
- Manually navigate to `/security` → **HTTP 403 · Access denied. This denial is
  recorded in the audit trail.**

Return to the Facilities Manager window. Press **Reset scenario** in the top bar. Clean
board.

## If something misbehaves

- **Scenario stuck**: press "Reset scenario", refresh, click Run again. The orchestrator
  is idempotent.
- **PO doesn't appear**: check the connection dots in the sidebar footer — SSE may have
  dropped. Refresh the incident detail page.
- **Ask the data returns generic text**: the LocalDashboardClient only recognises MTTR,
  downtime, open-incidents, welfare-risk questions. Use one of the suggestion chips for
  guaranteed answer quality.
- **Login page doesn't list users**: `pnpm db:seed` wasn't run against the current
  `DATABASE_URL`. Re-run it.

## Talking points for questions

| Question | Answer |
| --- | --- |
| "Is this using our real SOPs?" | For the demo: no, synthetic ones in `content/sops/`. To swap: replace the markdown and re-run `pnpm corpus:ingest`. The retrieval pipeline is unchanged. |
| "How does the AI know it's grounded?" | Every returned answer's `chunkId` is validated against the live `document_chunks` table before display. Zero-citation responses are refused. Hallucinated citations trip an audit event. |
| "What if the AI hallucinates a PO?" | Human-in-the-loop — the PO card shows `pending_approval`, and the Approve button is gated by the RBAC matrix (Facilities Manager and up). Rejection requires a reason. |
| "How does this scale to your real components?" | Each proprietary component (OIP, Agent Builder, ProcureChain, Dashboard) has a thin OAuth-backed adapter. Setting env vars swaps in the real service — zero UI changes. |
| "What breaks if the network goes down mid-scenario?" | Every adapter has 5s / 30s timeouts, 2 retries with exp backoff, and 401 auto-recovery. If a component is unreachable, the LocalFallback keeps the demo running. |
