# Second Brain — Agent Instructions

This project is documentation-driven. The documentation is the source of truth. If code and documentation disagree, do not guess — stop and explain the inconsistency.

**Do not duplicate instructions into this file.** It is a pointer, kept deliberately thin so it cannot drift from the sources (GOV-4, `docs/DECISIONS.md`):

1. **Load `.ai/PROJECT_CONTEXT.md` first** — the session-start digest (vision, architecture, stack, philosophy).
2. **Follow `.ai/AGENT_WORKFLOW.md`** — the pipeline (Architect → Implementation → Review → Testing → Documentation → Merge) and the mandatory session start/end protocol.
3. **Obey `.ai/ARCHITECTURE_RULES.md`** — the non-negotiables. Violations are rejected regardless of whether the feature works.
4. **Claim work in `.ai/TASK_QUEUE.md`** before writing code; tasks come from `docs/12_TASKS.md`.
5. **Role boundaries live in `agents/`.** Codex, Cursor, and other coding agents act as _implementation_ agents within their claimed area. The TPM/architect/reviewer governance role is held by Claude (`agents/architect.md`, `agents/reviewer.md`) — implementation agents do not self-assign it.
6. **After completing work**, update `docs/PROJECT_STATE.md`, `docs/AI_HANDOFF.md`, `.ai/TASK_QUEUE.md`, and — when applicable — `docs/CHANGELOG.md` and `docs/DECISIONS.md`. Nothing is complete until documentation is updated.

Read order for the spec itself: `docs/DOCUMENT_INDEX.md`. Every implementer also reads `docs/11_CONTRIBUTING.md` — especially §8, Rules for AI Coding Agents.
