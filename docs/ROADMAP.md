# Roadmap

> Governance layer. The authoritative milestone definitions live in [02_PRD.md §7](02_PRD.md#7-milestones); this document is the high-level view plus the post-MVP horizon. Phase-level breakdown is in [MILESTONES.md](MILESTONES.md); the task-level backlog is [12_TASKS.md](12_TASKS.md).
>
> **Naming note (GOV-1, [DECISIONS.md](DECISIONS.md)):** this roadmap uses the PRD's milestone structure. An earlier planning sketch split AI and MCP into separate milestones — they are deliberately one milestone here (M4 Collaborate) because they share the same service layer and shipping one without the other fails the PRD's M4 exit criteria.

## M0 — Foundations

| | |
|---|---|
| **Objective** | A deployable skeleton: a user can sign up, log in, and see an empty authenticated app shell in production. |
| **Deliverables** | Repo + tooling, full database schema with RLS, auth flows, three-zone app shell, command palette, CI/CD, structured logging module. |
| **Dependencies** | None. |
| **Exit Criteria** | PRD M0 exit: signup → login → empty authenticated shell, in production, with CI gating merges. |

## M1 — Collect

| | |
|---|---|
| **Objective** | Capture works end-to-end: notes, folders, tags, attachments, daily notes. |
| **Deliverables** | Note CRUD + Tiptap live-markdown editor, folder tree with drag-and-drop, inline tags, attachment upload/embed, daily notes. |
| **Dependencies** | M0 (schema, auth, shell). |
| **Exit Criteria** | PRD M1 exit: create, edit, organize, tag, and delete notes and attachments entirely in production. |

## M2 — Connect

| | |
|---|---|
| **Objective** | The graph exists: wiki links, backlinks, graph view. |
| **Deliverables** | `[[` autocomplete, ID-resolved links with rename propagation, backlinks panel, React Flow graph (global + local modes). |
| **Dependencies** | M1 (note model and editor). |
| **Exit Criteria** | PRD M2 exit: link notes, see accurate backlinks without manual refresh, navigate the graph visually. |

## M3 — Discover

| | |
|---|---|
| **Objective** | Everything is findable by keyword or by meaning. |
| **Deliverables** | Full-text search with snippets, async embedding pipeline, hybrid (RRF) search, `⌘K`/`⌘P` search UX. |
| **Dependencies** | M1 (notes to index); M2's autocomplete infrastructure (SRCH-05/06) ships in M2. |
| **Exit Criteria** | PRD M3 exit: any owned note findable by keyword or natural-language query within the [02_PRD §6](02_PRD.md#6-non-functional-requirements) latency budgets. |

## M4 — Collaborate

| | |
|---|---|
| **Objective** | AI is a first-class participant: in-app chat and external MCP access to the same graph. |
| **Deliverables** | Note-scoped chat, vault chat with citations (RAG), streaming, MCP server with 14 tools + 2 resources, credential management. |
| **Dependencies** | M3 (retrieval powers vault chat and `search_knowledge`). |
| **Exit Criteria** | PRD M4 exit: converse with the graph in-app; connect an external MCP client that reads and writes it. |

## M5 — Launch Readiness

| | |
|---|---|
| **Objective** | Ship a public beta that honors every NFR budget and security commitment. |
| **Deliverables** | Performance hardening at 10k-note scale, threat-model verification, accessibility pass, vault export (FR-KO-6), SLI dashboards, runbook. |
| **Dependencies** | M0–M4 complete. |
| **Exit Criteria** | PRD M5 exit: NFR budgets hold under production monitoring; security review signed off; public beta opens. |

## M6 — Integrations & Extensions *(post-MVP horizon — not committed)*

| | |
|---|---|
| **Objective** | Extend the Knowledge Object graph to external sources and AI write-back, per [02_PRD §9](02_PRD.md#9-future-roadmap). |
| **Deliverables** | Sequenced individually after their own design passes: connectors (GitHub, Jira, Confluence, Slack, Drive, email, calendar), OCR/PDF, voice notes, version history, self-organizing knowledge, shared graphs. |
| **Dependencies** | M5 shipped; a design pass per feature ([12_TASKS.md](12_TASKS.md), Post-MVP Backlog Seeds). |
| **Exit Criteria** | Defined per feature when promoted from seed to milestone — never implicitly. |

## Sequencing

```
M0 ──> M1 ──> M2 ──> M3 ──> M4 ──> M5 ──> [M6 horizon]
```

Milestones are sequential by dependency ([02_PRD §7](02_PRD.md#7-milestones)). Within a milestone, task-level parallelism is governed by the dependency graph in [12_TASKS.md](12_TASKS.md), not by this document.
