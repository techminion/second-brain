/**
 * Representative markdown corpus for the FR-NOTE-2 round-trip property suite
 * (EDIT-03). Every document here uses only constructs the current editor
 * schema supports — `detectUnsupportedMarkdown` must stay empty for each —
 * and the suite asserts the three durability properties over all of them:
 * canonical fixed point, document-model preservation, and edit-save-reload
 * survival. Constructs the schema cannot hold yet (tables, task lists, raw
 * HTML) are exercised in markdown-round-trip.test.ts via the detector instead.
 */
export interface CorpusDocument {
  name: string;
  markdown: string;
}

export const roundTripCorpus: CorpusDocument[] = [
  {
    name: "meeting note with wiki links",
    markdown: [
      "# Weekly sync — 2026-07-24",
      "",
      "Attendees: **Amey**, *the other Amey*",
      "",
      "## Decisions",
      "",
      "- Ship [[Second Brain]] MVP without AI features",
      "- Revisit [[Retention Policy]] after the beta",
      "  - depends on [[Purge Worker]] telemetry",
      "- Next review on Friday",
      "",
      "## Actions",
      "",
      "1. Write up the ADR",
      "2. Link it from [[Decisions Index]]",
    ].join("\n"),
  },
  {
    name: "technical note with code",
    markdown: [
      "# Cursor pagination",
      "",
      "Keyset over `(updated_at, id)` beats offset because rows cannot shift mid-scroll.",
      "",
      "```ts",
      "const cursor = Buffer.from(JSON.stringify({ i: id, u: updatedAt }))",
      '  .toString("base64url");',
      "```",
      "",
      "The decode side **must** validate shapes before the values reach the query:",
      "",
      "```sql",
      "select * from notes where (updated_at, id) < ($1, $2) order by updated_at desc;",
      "```",
      "",
      "See [PostgREST docs](https://postgrest.org/en/stable/) for the `or=` syntax.",
    ].join("\n"),
  },
  {
    name: "reading note with quotes",
    markdown: [
      "# How to Take Smart Notes",
      "",
      "> A note is only as valuable as its context — the network it is embedded in.",
      "",
      "Ahrens argues the *slip-box* outperforms hierarchies:",
      "",
      "> - notes link forward and backward",
      "> - structure emerges, it is not imposed",
      "",
      "Compare with [[Zettelkasten]] and [Evergreen notes](https://notes.andymatuschak.org/Evergreen_notes).",
    ].join("\n"),
  },
  {
    name: "daily note",
    markdown: [
      "# 2026-07-24",
      "",
      "Slept well. Long block on the editor round-trip.",
      "",
      "---",
      "",
      "- reviewed three PRs",
      "- fixed the wiki-link escaping bug",
      "- gym at 6",
      "",
      "Tomorrow: start the shortcut manager.",
    ].join("\n"),
  },
  {
    name: "deep nesting",
    markdown: [
      "# Outline",
      "",
      "- level one",
      "  - level two",
      "    - level three",
      "      - level four keeps its indentation",
      "  - back to two",
      "- one again",
      "",
      "> A quote containing a list:",
      ">",
      "> - first",
      "> - second",
      "",
      "1. Ordered wrapper",
      "  1. nested ordered",
      "  2. sibling",
      "2. tail",
    ].join("\n"),
  },
  {
    name: "unicode and multilingual text",
    markdown: [
      "# Notes from Tokyo 🇯🇵",
      "",
      "日本語のテキストは**そのまま**残る必要がある。",
      "",
      "Arabic flows right-to-left: مرحبا بالعالم — and mixes with English.",
      "",
      "Accents: naïve café résumé; combining: é (é built from two code points).",
      "",
      "Emoji soup: 🧠🔗📝 — and math: ∑ᵢ xᵢ² ≤ ∞.",
    ].join("\n"),
  },
  {
    name: "markdown-lookalikes inside code",
    markdown: [
      "# Literal syntax survives fences",
      "",
      "```md",
      "**not bold** and [[not a wiki link]] and # not a heading",
      "```",
      "",
      "Inline too: `**still not bold**` and `[[still literal]]`.",
    ].join("\n"),
  },
  {
    name: "tricky punctuation",
    markdown: [
      "Intraword stars like a\\*b\\*c stay literal, snake_case_words keep underscores.",
      "",
      "Math in prose: 3 \\* 4 = 12, and a price like $5 is fine.",
      "",
      "Brackets that are \\[not a link\\], and a bare URL: [https://example.com/a?b=c&d=e](https://example.com/a?b=c&d=e).",
    ].join("\n"),
  },
  {
    name: "single paragraph",
    markdown: "Just one line of plain prose.",
  },
  {
    name: "image with alt and emphasis around it",
    markdown: [
      "Before the figure.",
      "",
      "![architecture diagram](https://example.com/arch.png)",
      "",
      "*Caption in italics under the image.*",
    ].join("\n"),
  },
];
