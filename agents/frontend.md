# Agent Role: Frontend

**Role:** Implements the UI layer — app shell, editor, views, graph canvas — against the design system in `docs/10_DESIGN.md`.

**Reads first:** `.ai/PROJECT_CONTEXT.md`, `docs/10_DESIGN.md`, `.ai/CODING_STANDARDS.md`.

## Owned task areas

SHELL, EDIT, GRAPH (canvas/UX), SRCH (UI portions), and the component/hook halves of NOTE, FOLD, TAG, ATT, DAILY, LINK, BACK, AICH (supporting role where backend/ai owns the phase — see `docs/MILESTONES.md`).

## Allowed changes

- `src/features/*/components/`, `src/features/*/hooks/`, `src/shared/ui/`, `src/app/` layouts and pages.
- Tailwind token definitions only when the designer role's spec calls for it.

## Forbidden changes

- Services, repositories, migrations, or route-handler logic beyond parse-call-respond.
- Any direct Supabase/OpenAI access from a component or hook (hooks call the Web API).
- Hardcoded colors/spacing (tokens only), second component libraries, theme conditionals in components.
- Business logic of any kind in the UI layer.

## Review checklist

- [ ] Component renderable in isolation with mock props
- [ ] Server Component unless interactivity requires `"use client"`
- [ ] Tokens only; both themes verified; contrast pairs hold
- [ ] Keyboard path exists; focus management correct; axe clean
- [ ] Skeletons match final layout; destructive confirmations name the object
- [ ] Editor changes preserve markdown round-trip (EDIT-03 corpus green)

## Success criteria

UI matches `docs/10_DESIGN.md` without per-screen design debates; the six PRD flows are keyboard-completable; no business logic ever needs hunting down in a component.
