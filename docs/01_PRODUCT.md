# 01. Product

> Part of the [Documentation Index](DOCUMENT_INDEX.md). Precedes [02_PRD.md](02_PRD.md), which turns this vision into buildable requirements.

## 1. Purpose

Second Brain is an AI-native knowledge operating system. It unifies notes, documents, and external knowledge sources — together with the AI interactions applied to them — into a single graph that both humans and AI agents can read, extend, and reason over.

**Second Brain is not a note-taking application with AI features. It is a knowledge graph with a note-taking interface.** Every artifact — a note, a document, a code repository, an issue, a meeting, an image, a conversation — is represented as a **Knowledge Object** (§2) inside that graph. Humans interact with the graph through a modern markdown editor and search interface; AI agents interact with it through the Model Context Protocol (MCP). Over time, the graph itself becomes richer as both humans and AI add links, summaries, and new knowledge derived from what's already there.

The product's reason for existing is narrow and specific: **existing knowledge tools were built before capable AI assistants existed, and it shows.** They treat AI as a bolt-on feature — a chat sidebar, a "summarize this page" button — rather than as a first-class consumer and contributor to the knowledge graph. Second Brain inverts that: the graph is designed from day one to be read *and written* by both humans and AI agents, through the same protocol, with the same guarantees.

## 2. The Knowledge Object

Second Brain's core abstraction is not the note — it is the **Knowledge Object**. A Knowledge Object is any artifact represented as a node in the graph: it has an owner, a type, common metadata (title, timestamps, tags), a body or reference to its content, and links to other Knowledge Objects. Wiki links, backlinks, search, embeddings, and AI chat all operate on Knowledge Objects generically — none of them are hardcoded against a `Note` model.

A **Markdown Note** is one Knowledge Object type. It is the primary one for MVP, but the data model, service layer, and MCP tool set are designed against the supertype, so that adding a new source of knowledge later is a matter of adding a new object type — not redesigning the graph.

| Knowledge Object type | Status | Source |
|---|---|---|
| Markdown Note | **MVP** | Authored in-app |
| Attachment (file) | **MVP** | Uploaded by user |
| PDF | Future | Upload / OCR |
| Image | Future | Upload / OCR |
| GitHub repository / file | Future | GitHub integration |
| Jira ticket | Future | Jira integration |
| Confluence page | Future | Confluence integration |
| Slack thread | Future | Slack integration |
| Calendar event | Future | Calendar integration |
| Email | Future | Email integration |
| Voice recording | Future | Voice notes |
| Bookmark / web clip | Future | Browser capture |
| Task | Future | Tasks feature |

**Scope boundary:** MVP implements exactly the two types marked **MVP** above. The rest of this table exists so the schema and service layer are designed to support the supertype correctly from day one (see [04_DATABASE.md](04_DATABASE.md), [05_API.md](05_API.md)) — it is not a commitment to build every row now. See §11 (Non-Goals).

## 3. Vision

> A knowledge operating system — one graph, populated by everything you capture and everything AI helps you capture, that any AI assistant can search, read, update, and reason over, because the knowledge lives in an open protocol, not inside a single vendor's chat window.

Knowledge Objects should outlive any single AI product cycle. The value of a knowledge graph compounds over years; the AI tools used to interact with it will change every few quarters. Second Brain's job is to be the stable, durable layer underneath — Knowledge Objects, a real database, an open protocol — so the AI layer on top can be swapped freely.

## 4. Core Philosophy

Nine commitments define the product. Each one rules out a class of decisions that would otherwise be tempting.

| Principle | What it means | What it rules out |
|---|---|---|
| **Markdown-first** | The canonical representation of the Markdown Note object type is plain markdown. Rich features (backlinks, tags, embeds) are layered on top via syntax, not a proprietary document model. | Binary/JSON document formats as the source of truth; lock-in via a custom editor format. |
| **AI-native** | AI is a core primitive of the data model and service layer — embeddings, chat, and summarization are first-class services operating on Knowledge Objects generically. | Treating AI chat as an isolated add-on with no access to the graph, backlinks, or search. |
| **Cloud-hosted** | The graph lives in a managed backend (Supabase), accessible from any device without a sync client. | Local-first/offline-first as the primary architecture (see §11, Non-Goals). |
| **MCP-first** | The Model Context Protocol is the primary integration surface for AI assistants — not a REST API with an MCP wrapper added later. | Designing the service layer around a single AI provider's plugin format. |
| **Fast** | Search, object load, and graph navigation are perceived-instant. Latency budgets are a design constraint, not a post-launch optimization. | Architectural choices that trade interactivity for feature breadth (e.g., full page reloads, unindexed search). |
| **Extensible** | The service layer, database schema, and MCP tool set are designed for future Knowledge Object types and integrations (GitHub, Jira, Slack, etc.) without core rewrites. | Hardcoding assumptions that only one object type (the markdown note) will ever exist. |
| **Open** | Data formats (markdown, standard SQL schema) and protocols (MCP) are open. Users can export their full graph at any time. | Proprietary export formats; vendor lock-in as a retention strategy. |
| **Unified knowledge graph** | Every Knowledge Object — regardless of type or source — is a node in one graph; wiki links and backlinks are edges. The graph, not the folder tree, is the primary mental model. | Treating folders as the only organizing structure; siloing different knowledge sources into separate, disconnected data models. |
| **Knowledge compounds** | Every interaction should increase the long-term value of the graph. AI should enrich, relate, and organize information — not just retrieve it. | AI features that only read and answer, and never propose enrichment back to the graph (pure retrieval with no contribution). |

## 5. Target Users

| Persona | Description | Primary need |
|---|---|---|
| **AI-forward knowledge worker** | Uses Claude, ChatGPT, or Cursor daily and wants their knowledge to be part of that workflow rather than a separate silo they have to copy-paste from. | Ask an AI assistant a question and have it read/cite/update real Knowledge Objects, from any client. |
| **Technical personal-knowledge-management (PKM) user** | Currently uses Obsidian or Logseq; comfortable with markdown, wiki links, and graph views; wants those primitives without running a local vault and sync plugin stack. | Familiar markdown-and-graph workflow, cloud-hosted, zero sync configuration. |
| **Researcher / writer** | Accumulates long-form notes, source material, and reading annotations over years; needs semantic recall across a large corpus, not just keyword search. | Hybrid full-text + semantic search across a growing graph; reliable backlinks. |
| **Early-adopter developer** | Wants to script, extend, or integrate their knowledge into other tools (CI, agents, custom clients) via a documented protocol. | MCP server and service layer that are stable, documented, and extensible. |

Non-target for the MVP: teams needing real-time multiplayer collaboration, and users who require fully offline/local-only operation. See §11.

The MVP is scoped to a single-owner graph, but nothing in the object model (§2) or philosophy (§4) is inherently personal — a workspace, shared vault, or team is a future ownership model layered on the same Knowledge Object graph, not an architectural rewrite. See §11 for why that stays out of MVP scope.

## 6. Guiding Principles

These principles govern tradeoffs when requirements conflict. They apply across every document in this set.

1. **Simplicity over infrastructure.** The system runs on Vercel + Supabase only. No Docker, Kafka, Redis, Kubernetes, RabbitMQ, or microservices until a *measured* scaling requirement demands it (see [03_ARCHITECTURE.md](03_ARCHITECTURE.md)).
2. **Protocol over platform.** Where a choice exists between building a proprietary integration and adopting an open protocol (MCP, standard markdown, SQL), the open protocol wins, even at short-term feature cost.
3. **Service layer over ad-hoc queries.** Business logic lives in a typed service layer, never inside UI components or scattered SQL calls (see [05_API.md](05_API.md)).
4. **Data outlives the app.** Users must always be able to export a complete, readable copy of their graph as plain markdown files.
5. **Speed is a feature, not a nice-to-have.** Every primary interaction (search, object open, link navigation) is held to an explicit latency budget.
6. **AI reads and writes through the same interfaces as humans.** The MCP server and the web app both call the same service layer — there is no separate, weaker API for AI access.

## 7. Product Pillars

The primary feature set (full detail in [02_PRD.md](02_PRD.md)) maps onto four pillars. Each pillar has an MVP scope and a future direction — keep the two separate when reading this table.

| Pillar | Role | MVP | Future |
|---|---|---|---|
| **Collect** | How knowledge enters the graph | Markdown notes, folders, tags, attachments, daily notes | PDFs, images, GitHub, Jira, Confluence, Slack, email, voice notes, web clips |
| **Connect** | How knowledge forms relationships | Wiki links, backlinks, graph view | Cross-object references (e.g. a note linking to a Jira ticket) |
| **Discover** | How knowledge is retrieved | Full-text search, semantic search | AI-surfaced recommendations, "similar to this," canonical-note suggestions |
| **Collaborate** | How AI acts on the graph, not just reads it | AI chat, vault chat, MCP server (read + write) | Duplicate-merge suggestions, auto-linking, canonical concept creation, auto-organization (§8) |

**Collaborate** is the pillar most distinct from competitors (§9) — it is where "knowledge compounds" (§4) stops being a slogan and becomes a concrete feature surface.

## 8. Self-Organizing Knowledge

Most competitors' AI features stop at retrieval: find relevant notes, answer a question, summarize a page. Second Brain's AI layer is designed to also propose changes back to the graph:

- *"You wrote this twice — should I merge them?"* — duplicate detection
- *"These notes appear related — should I link them?"* — auto-linking suggestion
- *"This concept appears in five places — create a canonical note?"* — canonicalization

These are **proposals, not silent writes**: every AI-initiated graph change requires explicit user confirmation before it's applied. The graph belongs to the user; AI edits it the way a careful collaborator would — surfacing a suggestion and waiting for approval — not the way a background job would. The specific confirmation mechanism (draft/apply pattern, diff preview, etc.) is an implementation detail for [05_API.md](05_API.md) and [09_SECURITY.md](09_SECURITY.md) once written.

**This capability is a long-term direction, not an MVP requirement.** It builds on the "Knowledge compounds" principle (§4) and depends on two things that *are* MVP requirements: (1) Knowledge Objects existing as a stable core abstraction (§2), and (2) the MCP server and AI services having read *and* write access to the graph (§6.6). The autonomous-suggestion behaviors themselves are sequenced after MVP — see [02_PRD.md](02_PRD.md).

## 9. Competitive Analysis

| Product | Model | AI integration | Graph/links | Extensibility | Hosting | Where Second Brain differs |
|---|---|---|---|---|---|---|
| **Obsidian** | Local-first markdown vault, plugin ecosystem | Community plugins only; no native AI, no protocol-level AI access | Strong — wiki links, backlinks, graph view (the closest structural relative) | Very high via community plugins (JS API, local) | Local files, optional paid sync | Second Brain keeps Obsidian's markdown/graph model but is cloud-hosted, generalizes "note" to Knowledge Object, and exposes the graph via MCP natively — no plugin required for AI access. |
| **Notion** | Cloud database/block editor | AI features are proprietary, closed, bolted onto the block model | Weak — page references exist but there's no first-class backlink/graph view | Low — closed platform, API is read/write on blocks, not protocol-based | Notion cloud only | Second Brain is markdown-native (portable, diffable, greppable) where Notion's block model is proprietary and difficult to export cleanly. |
| **AppFlowy** | Open-source Notion alternative, local + cloud | Early-stage AI features, not protocol-first | Moderate — database/page model, limited graph | High (open source) but not MCP-first | Self-host or cloud | Shares "open" values but is block/database-oriented, not markdown-and-graph oriented; no MCP-first design. |
| **Capacities** | Cloud, object-based PKM (notes as typed "objects") | Native AI features, but closed and proprietary — no open protocol access | Moderate — object relationships rather than freeform wiki links | Low — closed platform | Cloud only | Capacities' typed-object model is the closest existing analogue to Knowledge Objects (§2), but it's closed — Second Brain exposes the same idea through an open protocol any AI assistant can use. |
| **Reflect** | Cloud, daily-notes-centric markdown | Native AI (chat, backlink AI) but closed, single-vendor | Strong — backlinks, daily notes | Low — closed platform, no plugin/protocol ecosystem | Cloud only | Closest in spirit (cloud + markdown + AI), but Second Brain is MCP-first and open, so any AI assistant — not just Reflect's own — can access the graph. |
| **Logseq** | Local-first, block/outline-based markdown | Community plugins for AI; not protocol-native | Strong — blocks, backlinks, graph view | High via plugins (local) | Local files, optional sync | Second Brain adopts Logseq's graph philosophy but with page-based markdown (not block/outline-only) and cloud hosting instead of local-first. |

**The gap this reveals:** every product in this table is either (a) markdown/graph-native and local-first with AI bolted on via plugins (Obsidian, Logseq), or (b) cloud-hosted with native AI but closed and proprietary (Notion, Capacities, Reflect). None combine markdown-native portability, a unified knowledge graph, cloud hosting, and an open, protocol-level AI integration surface. None treat AI as a collaborator that proposes changes back to the graph (§8) rather than a read-only assistant. That combination is Second Brain's position.

## 10. Why This Product Exists

Three trends converged to create this gap:

1. **AI assistants became genuinely useful research/writing collaborators**, but they have no durable memory of a person's own knowledge unless that knowledge is explicitly fed to them each session.
2. **MCP emerged as a real, adopted, open standard** for connecting AI assistants to data sources — the first protocol-level (not vendor-level) answer to "let my AI read my stuff."
3. **Existing PKM tools predate both of these developments.** Their architectures (local vault + plugin API, or closed cloud + proprietary AI) were not designed for a world where the primary "client" of a knowledge base might be an AI agent rather than a human clicking through a UI, or where AI might need to *write*, not just read.

Second Brain exists to be the tool built *after* those three things were already true — a unified Knowledge Object graph for portability and connection, cloud-hosted for availability, and MCP-first so it works with whichever AI assistant the user prefers this year, and whichever one replaces it next year.

## 11. Non-Goals (MVP)

Explicitly out of scope, to keep the guiding principle of simplicity (§6.1) enforceable:

- **Local-first / offline-first operation.** The graph is cloud-hosted (Supabase); there is no local sync engine or offline write queue in the MVP.
- **Real-time multiplayer collaboration.** Single-owner graphs for MVP; shared/team ownership (§5) is a future consideration, not an MVP requirement.
- **Being an Obsidian plugin-compatible clone.** No commitment to Obsidian's plugin API or `.obsidian` config format.
- **General-purpose database/work-management platform** (i.e., not competing with Notion's databases or Jira's issue tracking directly) — integrations with those tools (§7, long-term features) are additive, not replacements.
- **Non-MVP Knowledge Object types.** The Knowledge Object abstraction (§2) is designed to support PDFs, GitHub, Jira, Confluence, Slack, calendar, email, and voice sources — but MVP implements exactly two concrete types: Markdown Note and Attachment. Everything else is a future connector, sequenced in [02_PRD.md](02_PRD.md).
- **Autonomous AI writes to the graph.** MVP's AI features (AI chat, vault chat) are read/answer-oriented. The self-organizing behaviors described in §8 — proposing merges, auto-links, or canonical notes — are a future capability, not an MVP requirement.

## 12. Related Documents

- [02_PRD.md](02_PRD.md) — turns these pillars into functional/non-functional requirements and milestones.
- [03_ARCHITECTURE.md](03_ARCHITECTURE.md) — the system design that implements the "simplicity over infrastructure" principle (§6.1).
- [04_DATABASE.md](04_DATABASE.md) — implements the Knowledge Object supertype/subtype pattern described in §2.
- [06_MCP.md](06_MCP.md) — the concrete design of the MCP-first commitment (§4) and the read/write access referenced in §8.
- [09_SECURITY.md](09_SECURITY.md) — data ownership and privacy commitments implied by "Open" (§4) and "data outlives the app" (§6.4).
