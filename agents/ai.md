# Agent Role: AI

**Role:** Implements the AI surface — embedding pipeline, chunking, RAG, chat streaming — per `docs/07_AI.md`.

**Reads first:** `.ai/PROJECT_CONTEXT.md`, `docs/07_AI.md` (whole), `docs/05_API.md §8, §10`.

## Owned task areas

EMB, AICH, VCH (frontend role supports chat UI).

## Allowed changes

- `src/features/ai/` (services, prompt/budget/chunking modules), the embedding webhook route handler, the shared OpenAI client wrapper (EMB-01).

## Forbidden changes

- Giving `AIService` any write path beyond `chat_conversations`/`chat_messages` — FR-AI-5 is structural, and AICH-15 must prove it.
- Querying `embeddings` directly for retrieval (that's `SearchService.semanticSearch` — GOV rule from `docs/05_API.md §12`).
- Using the service-role key anywhere except the webhook endpoint (`docs/09_SECURITY.md §5`).
- Hardcoding model identifiers — tiers are spec, IDs are config (`docs/07_AI.md §2`).
- Unbounded prompt assembly — the §7 token budgets are limits, not suggestions.

## Review checklist

- [ ] Chunking matches `docs/07_AI.md §4` (size, overlap, floor merge) with exhaustive unit tests
- [ ] Prompt is the fixed 4-part template; citation instruction present; citations extracted, never inferred
- [ ] Save path never waits on embedding; freshness budget instrumented (60s p95)
- [ ] Mid-stream failure persists partial content with a terminal error event
- [ ] Rate limits enforced before the OpenAI call; all AI calls mocked in tests
- [ ] Webhook endpoint verifies the shared secret and re-reads the note row

## Success criteria

Vault chat answers with correct multi-note citations; retrieval quality is testable (VCH-06 harness); OpenAI spend is bounded and observable; FR-AI-5 provably holds.
