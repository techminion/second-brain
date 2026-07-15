# Milestones — Phase Breakdown

> Governance layer. Expands each [ROADMAP.md](ROADMAP.md) milestone into implementation phases (the task areas from [12_TASKS.md](12_TASKS.md)). Statuses here are updated as work progresses; [PROJECT_STATE.md](PROJECT_STATE.md) holds the current snapshot. Owners are agent roles defined in [agents/](../agents/).
>
> Effort is expressed as task counts by complexity (S ≈ ≤half a day, M ≈ a day, L ≈ multi-day — see [12_TASKS.md §1](12_TASKS.md#1-how-to-use-this-backlog)).

## M0 — Foundations — **Status: Not started**

| Phase | Tasks | Owner | Depends on | Effort | Key risks |
|---|---|---|---|---|---|
| SETUP — repo & tooling | SETUP-01..14 | backend (designer for tokens) | — | 14 (10S/4M) | Token scaffold done wrong here propagates everywhere; get [10_DESIGN §3](10_DESIGN.md#3-design-tokens) right first. |
| DB — schema & RLS | DB-01..16 | database | SETUP-06 | 16 (7S/9M) | RLS gaps are security bugs, not tech debt; DB-14 (cross-user tests) is non-negotiable before any dependent phase. |
| AUTH — authentication | AUTH-01..14 | backend | DB-02, DB-16 | 14 (7S/7M) | Session/cookie handling errors are silent until exploited; follow [09_SECURITY §3](09_SECURITY.md#3-authentication) exactly. |
| SHELL — app shell | SHELL-01..10 | frontend | SETUP-02/13 | 10 (5S/3M/2L) | Shell layout decisions are expensive to reverse; SHELL-02 and SHELL-04 are the two L tasks of the milestone. |
| CI — pipeline | CI-01..08 | backend | SETUP-04/09 | 8 (4S/4M) | Weak CI gates undermine every later phase's "definition of done." |
| OBS-01 — logging module | OBS-01 | backend | SETUP-06 | 1 (1M) | Instrumentation tasks in every later milestone depend on it. |

## M1 — Collect — **Status: Not started**

| Phase | Tasks | Owner | Depends on | Effort | Key risks |
|---|---|---|---|---|---|
| NOTE — note service & views | NOTE-01..16 | backend (frontend for views) | DB, AUTH | 16 | Title dual-write invariant ([04_DATABASE §4.3](04_DATABASE.md#43-notes)) must hold from the first commit. |
| EDIT — editor | EDIT-01..18 | frontend | SETUP-03 | 18 | Highest-risk phase of MVP: markdown round-trip fidelity (EDIT-02/03) underpins the product's core guarantee (FR-NOTE-2). |
| FOLD — folders | FOLD-01..14 | backend + frontend | DB-05, NOTE | 14 | Cycle detection and delete-strategy UX (FR-FOLDER-3) are correctness features, not polish. |
| TAG — tags | TAG-01..10 | backend + frontend | DB-06, NOTE | 10 | Low risk. |
| ATT — attachments | ATT-01..12 | backend | DB-09 | 12 | Signed-URL discipline ([09_SECURITY §4](09_SECURITY.md#4-authorization)); cross-user storage test ATT-11 gates exit. |
| DAILY — daily notes | DAILY-01..08 | backend | NOTE | 8 | Low risk. |

## M2 — Connect — **Status: Not started**

| Phase | Tasks | Owner | Depends on | Effort | Key risks |
|---|---|---|---|---|---|
| SRCH-05/06/08 — title autocomplete | SRCH-05, 06, 08 | search | DB-04 | 3 | Sub-100ms budget; LINK-06 blocks on it. |
| LINK — wiki links | LINK-01..12 | backend + frontend | NOTE, EDIT | 12 | Link reconciliation transactionality (LINK-04) is what makes backlinks trustworthy; rename propagation (LINK-08) per [05_API §4](05_API.md#4-noteservice). |
| BACK — backlinks | BACK-01..06 | backend | LINK-04 | 6 | Low risk given the `target_object_id` index. |
| GRAPH — graph view | GRAPH-01..18 | frontend | LINK-04 | 18 | 2,000-node interactivity NFR (GRAPH-13); accessibility list alternative (GRAPH-11) is required, not optional. |

## M3 — Discover — **Status: Not started**

| Phase | Tasks | Owner | Depends on | Effort | Key risks |
|---|---|---|---|---|---|
| FTS — full-text search | FTS-01..10 | search | DB-04 | 10 | 300ms p95 budget at 10k notes. |
| EMB — embedding pipeline | EMB-01..14 | ai | DB-08 | 14 | Webhook reliability and the 60s freshness budget ([07_AI §3](07_AI.md#3-embedding-strategy)); chunking correctness (EMB-02/14) drives all retrieval quality. |
| SEM — hybrid search | SEM-01..09 | search | FTS, EMB | 9 | RRF must match [08_SEARCH §4](08_SEARCH.md#4-hybrid-ranking)'s worked example exactly; graceful degradation (SEM-06). |
| SRCH — search UX (remainder) | SRCH-01..04, 07 | frontend | SEM, FTS | 5 | Low risk. |

## M4 — Collaborate — **Status: Not started**

| Phase | Tasks | Owner | Depends on | Effort | Key risks |
|---|---|---|---|---|---|
| AICH — AI chat foundation | AICH-01..16 | ai | EMB, DB-10 | 16 | FR-AI-5 structural test (AICH-15): AI must be provably unable to write outside chat history. |
| VCH — vault chat | VCH-01..08 | ai | AICH, SEM | 8 | Citation correctness across multiple sources (VCH-04); honest no-context behavior (VCH-07). |
| MCP — MCP server | MCP-01..20 | mcp | services from M1–M3 | 20 | Never touches the service-role key (MCP-03); parity test MCP-18 is the FR-MCP-2 guarantee. |
| CRED — credentials | CRED-01..08 | backend | DB-11 | 8 | Raw token shown once, hash-only storage; CRED-08 log audit. |

## M5 — Launch Readiness — **Status: Not started**

| Phase | Tasks | Owner | Depends on | Effort | Key risks |
|---|---|---|---|---|---|
| PERF — performance | PERF-01..10 | backend + reviewer | M1–M4 | 10 | Budgets that fail at 10k-note scale mean architectural rework — test early via PERF-01 seed data. |
| SEC — security hardening | SEC-01..10 | reviewer | M4 | 10 | T1–T9 verification (SEC-03) gates launch; no exceptions. |
| A11Y — accessibility | A11Y-01..06 | designer + frontend | M4 | 6 | WCAG 2.1 AA is a PRD NFR, not a stretch goal. |
| EXP — export | EXP-01..04 | backend | NOTE, ATT, FOLD | 4 | FR-KO-6 round-trip fidelity (EXP-04). |
| OBS — observability & launch | OBS-02..10 | backend | OBS-01 | 9 | OBS-09 launch checklist is the milestone exit. |

## Status Legend

`Not started` · `In progress` · `Blocked` · `Done` — phase status changes are reflected here and summarized in [PROJECT_STATE.md](PROJECT_STATE.md).
