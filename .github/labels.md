# Label Taxonomy

Labels applied to issues and PRs. Keep this list closed — propose additions via an `adr-proposal` issue rather than creating labels ad hoc.

## Type

| Label | Meaning |
|---|---|
| `type:feat` | New capability (maps to `feat:` commits) |
| `type:fix` | Bug fix |
| `type:docs` | Documentation only |
| `type:chore` | Tooling, CI, dependencies |
| `type:refactor` | Behavior-preserving restructure |

## Area (mirrors task-area prefixes in docs/12_TASKS.md)

`area:setup` · `area:db` · `area:auth` · `area:shell` · `area:ci` · `area:notes` · `area:editor` · `area:folders` · `area:tags` · `area:attachments` · `area:daily` · `area:links` · `area:backlinks` · `area:graph` · `area:search` · `area:embeddings` · `area:ai-chat` · `area:mcp` · `area:credentials` · `area:perf` · `area:security` · `area:a11y` · `area:export` · `area:obs`

## Milestone

`M0` · `M1` · `M2` · `M3` · `M4` · `M5` — matching [docs/ROADMAP.md](../docs/ROADMAP.md).

## Priority

| Label | Meaning |
|---|---|
| `P0` | Critical path of the current sprint |
| `P1` | Current sprint, parallelizable |
| `P2` | Next in line |

## Status / Process

| Label | Meaning |
|---|---|
| `blocked` | Cannot proceed — reason must be in the issue and `.ai/TASK_QUEUE.md` |
| `needs-decision` | Waiting on an entry in `docs/DECISIONS.md` |
| `spec-conflict` | Documentation contradiction found — architect role resolves before code proceeds |
| `agent:claude` / `agent:codex` / `agent:cursor` | Which agent produced the work |
| `security` | Touches auth, RLS, secrets, or the MCP surface — reviewer role required |
