# Agent Workflow

> How AI agents collaborate on Second Brain. Platform-agnostic: the same rules bind Claude Code, Codex, Cursor, and any future agent. Role boundaries live in [agents/](../agents/); hard rules in [ARCHITECTURE_RULES.md](ARCHITECTURE_RULES.md).

## Pipeline

Every unit of work flows through six stages:

```
Architect ──> Implementation ──> Review ──> Testing ──> Documentation ──> Merge
```

| Stage | Who | What |
|---|---|---|
| **Architect** | `agents/architect.md` role (or the human) | Confirms the task is in [TASK_QUEUE.md](TASK_QUEUE.md), correctly scoped, dependencies merged, and traceable to a doc section. Ambiguous tasks stop here — never at implementation time. |
| **Implementation** | Owning role per task-area prefix (GOV-5) | One branch per task (`feat/<task-id>-<desc>`), scope limited to the task, per [docs/11_CONTRIBUTING.md §8](../docs/11_CONTRIBUTING.md#8-rules-for-ai-coding-agents). |
| **Review** | `agents/reviewer.md` role — never the implementing agent | Checks against the owning role's checklist + [ARCHITECTURE_RULES.md](ARCHITECTURE_RULES.md). Architecture violations are rejections, not comments. |
| **Testing** | Implementing agent writes; reviewer verifies | Tests per [docs/11_CONTRIBUTING.md §5](../docs/11_CONTRIBUTING.md#5-testing-strategy); CI green is non-negotiable; skipped checks count as failures. |
| **Documentation** | Implementing agent | Update any doc the change affects, plus the session-close protocol below. A feature without updated docs is incomplete. |
| **Merge** | Human, or architect role with human sign-off | Squash-merge; PR title in Conventional Commits form. |

## Session Protocol (every agent, every session)

**Start:**
1. Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), then [docs/PROJECT_STATE.md](../docs/PROJECT_STATE.md), then the top entry of [docs/AI_HANDOFF.md](../docs/AI_HANDOFF.md).
2. Claim a task in [TASK_QUEUE.md](TASK_QUEUE.md) (status → `Claimed`, add your agent name). Only claim tasks whose dependencies are `Done`.
3. Read the doc sections the task references — before writing code.

**End (mandatory, even for incomplete sessions):**
1. Update [TASK_QUEUE.md](TASK_QUEUE.md) statuses.
2. Update [docs/PROJECT_STATE.md](../docs/PROJECT_STATE.md).
3. Append a full entry to [docs/AI_HANDOFF.md](../docs/AI_HANDOFF.md).
4. If a decision was made or changed: record it in [docs/DECISIONS.md](../docs/DECISIONS.md).
5. If user-visible behavior changed: update [docs/CHANGELOG.md](../docs/CHANGELOG.md) Unreleased.

## Platform Responsibilities

| Platform | Expected use | Notes |
|---|---|---|
| **Claude Code** | Primary implementation + review agent; the TPM/architect governance role | Runs the full session protocol natively; handles multi-file feature slices and migrations. |
| **Codex** | Implementation of well-scoped, single-area tasks | Best given one task ID + its doc references; must still complete the session-close protocol (the PR description may carry the handoff entry for a human to paste if the agent cannot write files outside the diff). |
| **Cursor** | Interactive/pairing implementation, UI-heavy tasks | The human driver is responsible for ensuring the session-close protocol runs. |
| **Future agents** | Same contract | Any agent that can read the repo and follow this file may contribute; no agent gets a weaker rule set. |

## Conflict Rules

- Two agents never hold `Claimed` tasks in the same area prefix simultaneously (GOV-5).
- An agent that discovers a spec conflict **stops and records it** (AI_HANDOFF + a `Blocked` status) — it does not pick a side in code.
- Digest files in `.ai/` always lose to `docs/` (GOV-4); fixing a digest is an architect-role task.
