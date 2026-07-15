# 10. Design System & UX

> Part of the [Documentation Index](DOCUMENT_INDEX.md). Governs the UI Layer from [03_ARCHITECTURE.md §4](03_ARCHITECTURE.md#4-component-architecture), built on Tailwind CSS + shadcn/ui with the Tiptap editor and React Flow graph (MVP tech stack, [.claude/ARCHITECT_PROMPT.md](../.claude/ARCHITECT_PROMPT.md)). Satisfies the accessibility NFR (WCAG 2.1 AA) and the perceived-performance principles from [02_PRD.md §6](02_PRD.md#6-non-functional-requirements) and [01_PRODUCT.md §4](01_PRODUCT.md#4-core-philosophy) ("Fast").

## 1. Purpose & Scope

This document sets the design rules an implementing agent needs to build consistent UI without a designer in the loop: tokens, component philosophy, interaction patterns, and the editor/graph UX decisions specific to this product. It deliberately does *not* contain pixel-perfect mockups — the design system is rules plus primitives, and screens are composed from them.

**The product's visual character in one sentence:** a calm, text-first workspace — closer to a well-typeset document than a dashboard — where chrome recedes and the user's own knowledge is the interface.

## 2. Design Principles

1. **Content is the UI.** Notes fill the space; navigation, panels, and toolbars stay visually quiet and collapse away. Nothing competes with the text the user is reading or writing.
2. **Keyboard-first, mouse-complete.** Every core action has a keyboard path (§8) — the target users ([01_PRODUCT.md §5](01_PRODUCT.md#5-target-users)) live in editors and terminals — but nothing *requires* the keyboard.
3. **Perceived speed over spinners.** Optimistic updates, skeletons that match final layout, and streaming text ([07_AI.md §8](07_AI.md#8-streaming)) — a spinner is an admission of failure against the "Fast" pillar.
4. **One component library, extended — not two.** Every primitive is shadcn/ui or built from its underlying primitives (Radix). No second component library is ever introduced alongside it; visual drift between two systems is unfixable after the fact.
5. **Accessible by construction, not by audit.** WCAG 2.1 AA is a build-time constraint (§6), not a launch-gate checklist.

## 3. Design Tokens

All values are Tailwind theme tokens — never hardcoded hex/px in component code. The token layer is what makes dark mode (§7) a non-event.

### 3.1 Typography

| Role | Token | Value |
|---|---|---|
| UI text | `font-sans` | Inter (variable), system-ui fallback stack |
| Editor/reading text | `font-sans` (same) | One family across UI and content — the editor is the app, a font switch between chrome and content would fragment it |
| Code (inline, blocks) | `font-mono` | JetBrains Mono, ui-monospace fallback |
| Base size | `text-base` | 16px / 1.5 line-height for UI; editor body 16px / 1.7 — prose breathes more than chrome |
| Scale | Tailwind default modular scale | `text-sm` (13–14px) for secondary UI, `text-xs` floors at 12px — nothing below 12px, ever |
| Headings in notes | Proportional scale h1–h3 (`text-2xl`/`text-xl`/`text-lg`, semibold), h4–h6 same size as body, semibold | Deep heading hierarchies in personal notes are rare; visual differentiation past h3 adds noise, not structure |

### 3.2 Spacing & Layout

| Rule | Value |
|---|---|
| Spacing unit | Tailwind's 4px base scale, exclusively — no arbitrary values (`p-[13px]` is a lint error, [11_CONTRIBUTING.md](DOCUMENT_INDEX.md#11_contributingmd-planned)) |
| Editor measure | `max-w-prose`-equivalent (~65–70ch) centered column — reading-optimal line length regardless of window width |
| App shell | Three-zone layout: collapsible sidebar (navigation: folders, tags, daily note) · main content (editor/graph/search) · collapsible right panel (backlinks, note-scoped chat) |
| Radii | `rounded-md` default for interactive elements, `rounded-lg` for surfaces (cards, popovers, dialogs) — two radii total |
| Elevation | Borders over shadows for structure; shadows reserved for genuinely floating elements (popovers, dialogs, command palette) |

### 3.3 Color

Semantic tokens only — components reference *roles*, never palette values, which is what lets dark mode be a token swap (§7):

| Role token | Usage |
|---|---|
| `background` / `foreground` | App canvas and primary text |
| `muted` / `muted-foreground` | Secondary surfaces, secondary text (timestamps, counts) |
| `card` / `popover` | Raised surfaces |
| `primary` | The single accent: active states, links, wiki links, focus rings, primary buttons |
| `destructive` | Delete actions and their confirmations only |
| `border` / `input` / `ring` | Structure and focus |

**One accent color.** Wiki links, buttons, and active navigation share `primary` — a knowledge tool with a rainbow of accents stops feeling calm (§1). Graph view (§10) and tag chips may derive muted categorical variants, but body text and chrome never exceed the single accent.

## 4. Component Philosophy

| Rule | Rationale |
|---|---|
| shadcn/ui components are copied into the repo and owned, not consumed as a dependency | That's shadcn's model — components are code you own; customizations happen in-place with no upstream coupling. |
| Feature components live in their feature folder; only genuinely shared primitives live in a shared `ui/` location | Mirrors the feature-first rule ([03_ARCHITECTURE.md §5.1](03_ARCHITECTURE.md#5-layering--code-organization-principles)) — a component used by one feature is that feature's code. |
| Components receive data via props/hooks and render it — no business logic, no direct data access | The layering rule ([03_ARCHITECTURE.md §5.4](03_ARCHITECTURE.md#5-layering--code-organization-principles)) restated as a component-level test: a component should be renderable in isolation with mock props. |
| Server Components by default; `"use client"` only where interactivity demands it | Editor, graph, chat, and command palette are client; listings, panels, and shells render on the server — smaller bundles serve the "Fast" pillar. |
| Loading states are skeletons that match final layout, not spinners | Prevents layout shift and reads as faster (§2.3). |
| Every destructive action is confirmable, and the confirmation names the object | "Delete *Q3 Planning*?" — never a bare "Are you sure?". Folder deletion additionally surfaces the contents-strategy choice required by FR-FOLDER-3 ([05_API.md §5](05_API.md#5-folderservice)). |
| Empty states teach | A brand-new graph (FR-AUTH-5) shows how to create a note, link with `[[`, and open the command palette — the empty state is onboarding, there is no separate tutorial. |

## 5. Editor UX (Tiptap)

The editor is the single most important surface in the product. Its defining decision:

**Live-formatted markdown (hybrid WYSIWYG), not raw-text-plus-preview.** Markdown syntax formats *as you type* — `# ` becomes a heading, `**bold**` renders bold with markers hidden until the cursor enters the span, `[[` opens link autocomplete. Obsidian's live-preview mode is the interaction benchmark. A split raw/preview mode is rejected: it doubles the surface an implementer must keep consistent and serves neither persona in [01_PRODUCT.md §5](01_PRODUCT.md#5-target-users) better than a good hybrid. The markdown-first guarantee (FR-NOTE-2 round-tripping) is enforced by the persistence format — the document *is* markdown ([04_DATABASE.md §4.3](04_DATABASE.md#43-notes)) — not by showing raw syntax at all times.

| Interaction | Behavior |
|---|---|
| Wiki links | `[[` triggers autocomplete (FR-LINK-3) backed by `suggestNoteTitles` ([08_SEARCH.md §6](08_SEARCH.md#6-wiki-links--autocomplete)); Enter inserts the link; unresolved links render visually distinct (dashed underline) and create-on-click (FR-LINK-4) |
| Slash menu | `/` at line start opens a block-insert menu (heading, list, code block, image) — discoverability for users who don't know markdown syntax, no toolbar required |
| Autosave | Debounced (~800ms after last keystroke) plus save-on-blur/navigation (FR-NOTE-5); a quiet "Saved" indicator, never a modal or a save button |
| Paste | Pasted markdown parses as markdown; pasted rich text converts to markdown; pasted image uploads as an Attachment (FR-ATTACH-1) and inserts inline (FR-ATTACH-4) |
| Formatting UI | Minimal floating toolbar on text selection (bold, italic, code, link) — the keyboard and slash menu are primary; no persistent toolbar row |

## 6. Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|---|---|
| Semantic foundation | shadcn/ui's Radix primitives ship correct ARIA roles, focus traps, and keyboard handling for dialogs/menus/popovers — the baseline is inherited, not built |
| Contrast | All token pairs (§3.3) maintain ≥ 4.5:1 for text, ≥ 3:1 for large text/UI boundaries, verified in both themes at token-definition time — a failing pair is a broken token, not a per-screen bug |
| Keyboard | Every §8 flow completable without a mouse; visible `ring` focus indicators everywhere; no positive `tabindex` |
| Streaming chat | Chat responses render into an `aria-live="polite"` region — screen readers announce streamed answers ([07_AI.md §8](07_AI.md#8-streaming)) without interrupting |
| Graph view | The graph canvas (§10) is inherently visual; every node is *also* reachable as a focusable list (the same data as text), so graph-only information has a non-visual path — the accessible alternative is structural, not an afterthought |
| Motion | All animation respects `prefers-reduced-motion` (§9) |
| Verification | Automated checks (axe) in CI plus keyboard-only walkthrough of the §8 flows per release ([11_CONTRIBUTING.md](DOCUMENT_INDEX.md#11_contributingmd-planned)) |

## 7. Dark Mode

- Both themes ship at MVP as first-class citizens — the target audience skews dark-mode-default, so dark is not a downstream port of light.
- Implementation: the semantic token layer (§3.3) swaps values via the `.dark` class strategy; **no component contains a theme conditional** — a component that knows which theme is active is a token-layer bug.
- Default follows `prefers-color-scheme`; a manual override (light/dark/system) persists per user.
- Editor content, syntax highlighting in code blocks, and the graph view are all token-driven and theme-tested — the editor in dark mode is the single most-used surface in the product and gets first-class contrast attention (§6).

## 8. Keyboard Shortcuts

`⌘` = `Ctrl` on Windows/Linux throughout.

| Shortcut | Action |
|---|---|
| `⌘K` | Command palette — the universal entry point: search, navigation, and commands in one surface (backed by `SearchService.search` + a static command registry) |
| `⌘N` | New note |
| `⌘P` | Quick-open note by title (`suggestNoteTitles`) |
| `⌘D` | Open today's daily note (FR-DAILY-1) |
| `⌘E` | Toggle right panel (backlinks / chat) |
| `⌘\` | Toggle sidebar |
| `⌘F` | Search within current note |
| `⇧⌘F` | Global search |
| `⇧⌘G` | Open graph view |
| `[[` | Wiki-link autocomplete (in editor) |
| `/` | Block menu (in editor, line start) |
| Standard editing | `⌘B`/`⌘I` formatting, `⌘Z`/`⇧⌘Z` undo/redo — platform conventions, never remapped |

The command palette is the discoverability mechanism for everything else: every command it lists shows its shortcut inline, so the palette teaches the shortcuts. Custom rebinding is not offered in MVP.

## 9. Motion & Animation

| Rule | Detail |
|---|---|
| Duration | 150ms (micro: hovers, toggles) / 250ms (structural: panels, dialogs) — two durations total, tokenized |
| Easing | Standard ease-out for entrances, ease-in for exits |
| What animates | Panel collapse/expand, dialog/popover enter-exit, command palette, streamed-text arrival — transitions that *explain a spatial or temporal change* |
| What never animates | Text editing response, search result rendering, note navigation — anything on the critical input path renders immediately; animation there is latency in costume |
| Reduced motion | `prefers-reduced-motion` collapses all durations to 0 (instant state changes); streaming text still appears incrementally — that's content arriving, not decoration (§6) |

## 10. Graph View UX (React Flow)

| Decision | Detail |
|---|---|
| Rendering | React Flow with force-directed layout; nodes = notes (titles as labels), edges = wiki links, from `GraphService.getGraph` ([05_API.md §7](05_API.md#7-graphservice)) |
| Scale posture | Global graph is honest up to the ~2,000-node interactivity NFR ([02_PRD.md §6](02_PRD.md#6-non-functional-requirements)); past a few hundred nodes the *default* entry point becomes the local graph (FR-GRAPH-4) — a note and its neighbors — with global as an explicit zoom-out |
| Interactions | Click node → open note (FR-GRAPH-2); hover → highlight direct connections, fade the rest; scroll/pinch zoom and pan; tag/folder filters (FR-GRAPH-3) as chips over the canvas |
| Visual encoding | Node size scales subtly with connection count (hubs read as hubs); current note highlighted in `primary`; orphan notes (no links) visually muted — an honest signal of what's not yet connected |
| Accessibility | Every rendered node also appears in a focusable sidebar list synchronized with the canvas (§6) |

## 11. Responsive Behavior

MVP is a **desktop-first web app** — the personas ([01_PRODUCT.md §5](01_PRODUCT.md#5-target-users)) do their knowledge work at a desk, and the editor is the product. Responsive behavior is graceful degradation, not a parallel mobile design:

| Breakpoint | Behavior |
|---|---|
| ≥ 1280px | Full three-zone shell (§3.2): sidebar + content + right panel |
| 768–1279px | Right panel becomes an overlay (toggled via `⌘E`); sidebar collapsible, collapsed by default at the narrow end |
| < 768px | Single-column: content only; sidebar and panels as full-height drawers; editor, search, and reading fully functional — graph view and multi-panel workflows are explicitly desktop-class and may be reduced (local graph only) |

Touch targets meet 44px minimums on coarse-pointer devices via responsive spacing tokens, but no MVP feature may *require* touch-specific interaction. A native/PWA mobile experience is a future consideration, deliberately absent from [02_PRD.md §9](02_PRD.md#9-future-roadmap)'s committed roadmap.

## 12. Related Documents

- [01_PRODUCT.md §4–5](01_PRODUCT.md#4-core-philosophy) — the "Fast" pillar and personas that drive keyboard-first, desktop-first decisions.
- [02_PRD.md §6](02_PRD.md#6-non-functional-requirements) — the WCAG 2.1 AA requirement and the latency/interactivity budgets §2 and §10 design against.
- [03_ARCHITECTURE.md §5](03_ARCHITECTURE.md#5-layering--code-organization-principles) — the no-business-logic-in-components rule §4 restates at component level.
- [05_API.md](05_API.md) — the service methods every interactive surface here calls.
- [07_AI.md §8](07_AI.md#8-streaming) — the streaming events the chat UI (§6) renders.
- [08_SEARCH.md §6](08_SEARCH.md#6-wiki-links--autocomplete) — the autocomplete backing `[[` and `⌘P`.
- [11_CONTRIBUTING.md](DOCUMENT_INDEX.md#11_contributingmd-planned) — lint/CI enforcement of the token and accessibility rules stated here.
