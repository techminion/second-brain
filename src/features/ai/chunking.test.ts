import { describe, expect, it } from "vitest";

import { chunkingLimits, chunkMarkdown, estimateTokens, type TextChunk } from "./chunking";

const { charsPerToken, minTokens, overlapTokens, targetTokens } = chunkingLimits;
const targetChars = targetTokens * charsPerToken;
const overlapChars = overlapTokens * charsPerToken;
const minChars = minTokens * charsPerToken;
// A packed piece plus a merged floor fragment plus its overlap.
const maxChunkChars = targetChars - overlapChars + minChars + overlapChars;

function sentence(n: number): string {
  return `Sentence ${n} explains one small idea about the knowledge graph in plain words.`;
}

function paragraph(from: number, count: number): string {
  return Array.from({ length: count }, (_, i) => sentence(from + i)).join(" ");
}

/** Checks the invariants every multi-chunk result must hold. */
function expectWellFormed(source: string, chunks: TextChunk[]): void {
  const text = source.replace(/\r\n?/g, "\n");
  expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, index) => index));

  let cursor = 0;
  let coveredTo = 0;
  for (const chunk of chunks) {
    expect(chunk.text).toBe(chunk.text.trim());
    expect(chunk.text.length).toBeGreaterThan(0);
    expect(chunk.text.length).toBeLessThanOrEqual(maxChunkChars);
    // Exact substring, in order, never skipping content.
    const at = text.indexOf(chunk.text, cursor);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(text.slice(coveredTo, at).trim()).toBe("");
    cursor = at + 1;
    coveredTo = at + chunk.text.length;
  }
  expect(text.slice(coveredTo).trim()).toBe("");
}

describe("estimateTokens", () => {
  it("counts four characters per token, rounding up", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
});

describe("chunkMarkdown — short notes", () => {
  it("returns no chunks for an empty or whitespace-only body", () => {
    expect(chunkMarkdown("")).toEqual([]);
    expect(chunkMarkdown(" \n\n\t ")).toEqual([]);
  });

  it("embeds a short note as a single trimmed chunk", () => {
    expect(chunkMarkdown("\n# Idea\n\nA short thought.\n\n")).toEqual([
      { index: 0, text: "# Idea\n\nA short thought." },
    ]);
  });

  it("keeps a note at exactly the target size as one chunk", () => {
    const body = "x".repeat(targetChars);
    expect(chunkMarkdown(body)).toEqual([{ index: 0, text: body }]);
  });

  it("splits a note one character over the target", () => {
    const body = `${paragraph(1, 20)}\n\n${paragraph(21, 20)}`.slice(0, targetChars + 1);
    expect(body.trim()).toHaveLength(targetChars + 1);
    const chunks = chunkMarkdown(body);
    expect(chunks.length).toBeGreaterThan(1);
    expectWellFormed(body, chunks);
  });

  it("normalizes CRLF line endings", () => {
    expect(chunkMarkdown("# A\r\n\r\nline one\r\nline two")).toEqual([
      { index: 0, text: "# A\n\nline one\nline two" },
    ]);
  });
});

describe("chunkMarkdown — long notes", () => {
  it("breaks at headings when sections fit", () => {
    const sections = ["Alpha", "Beta", "Gamma"].map(
      (name, i) => `## ${name}\n\n${paragraph(i * 100, 12)}`,
    );
    const body = sections.join("\n\n");
    const chunks = chunkMarkdown(body);

    expectWellFormed(body, chunks);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.text.startsWith("## Alpha")).toBe(true);
    // Later chunks open with overlap from the previous section, then their heading.
    expect(chunks[1]?.text).toContain("## Beta");
    expect(chunks[1]?.text).not.toContain("## Alpha");
    expect(chunks[2]?.text).toContain("## Gamma");
    expect(chunks[2]?.text).not.toContain("## Beta\n");
  });

  it("packs small sections together instead of one chunk per heading", () => {
    const body = Array.from(
      { length: 12 },
      (_, i) => `### Item ${i}\n\n${paragraph(i * 10, 3)}`,
    ).join("\n\n");
    const chunks = chunkMarkdown(body);

    expectWellFormed(body, chunks);
    expect(chunks.length).toBeLessThan(12);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("splits an oversized section at paragraphs, then sentences", () => {
    const body = `# One long section\n\n${paragraph(1, 20)}\n\n${paragraph(21, 40)}`;
    const chunks = chunkMarkdown(body);

    expectWellFormed(body, chunks);
    for (const chunk of chunks.slice(0, -1)) {
      // Every boundary lands at the end of a sentence, never mid-sentence.
      expect(chunk.text).toMatch(/[.]$/);
    }
  });

  it("overlaps adjacent chunks by about 75 tokens, starting at a sentence", () => {
    const body = paragraph(1, 80);
    const chunks = chunkMarkdown(body);

    expectWellFormed(body, chunks);
    for (let i = 1; i < chunks.length; i += 1) {
      const previous = chunks[i - 1]?.text ?? "";
      const current = chunks[i]?.text ?? "";
      const firstSentence = current.slice(0, current.indexOf(".") + 1);
      expect(firstSentence).toMatch(/^Sentence \d+/);
      expect(previous.endsWith(firstSentence) || previous.includes(firstSentence)).toBe(true);
      expect(firstSentence.length).toBeLessThanOrEqual(overlapChars);
    }
  });

  it("never splits a fenced code block at a blank line or heading inside it", () => {
    const code = ["```md", "# not a heading", "", "line after blank", "```"].join("\n");
    const body = `${paragraph(1, 20)}\n\n${code}\n\n${paragraph(100, 20)}`;
    const chunks = chunkMarkdown(body);

    expectWellFormed(body, chunks);
    expect(chunks.some((chunk) => chunk.text.includes(code))).toBe(true);
  });

  it("splits an oversized code block at line boundaries", () => {
    const lines = Array.from({ length: 150 }, (_, i) => `const value${i} = compute(${i});`);
    const body = ["```ts", ...lines, "```"].join("\n");
    const chunks = chunkMarkdown(body);

    expectWellFormed(body, chunks);
    for (const chunk of chunks) {
      for (const line of chunk.text.split("\n").slice(1, -1)) {
        expect(line).toMatch(/^const value\d+ = compute\(\d+\);$/);
      }
    }
  });

  it("splits unpunctuated text at word boundaries", () => {
    const body = Array.from({ length: 800 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkMarkdown(body);

    expectWellFormed(body, chunks);
    const words = new Set(body.split(" "));
    for (const chunk of chunks) {
      for (const word of chunk.text.split(" ")) {
        expect(words.has(word)).toBe(true);
      }
    }
  });

  it("hard-splits a single run longer than a chunk", () => {
    const body = "a".repeat(targetChars * 3);
    const chunks = chunkMarkdown(body);

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.map((chunk) => chunk.text).join("")).toBe(body);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(targetChars);
    }
  });

  it("merges a trailing fragment below the floor into the previous chunk", () => {
    const body = `## Main\n\n${paragraph(1, 20)}\n\n## End\n\nDone.`;
    const chunks = chunkMarkdown(body);

    expectWellFormed(body, chunks);
    const last = chunks.at(-1)?.text ?? "";
    expect(last.endsWith("## End\n\nDone.")).toBe(true);
    expect(last.length).toBeGreaterThan(minChars);
  });

  it("leaves no chunk under the floor", () => {
    const body = [
      "# Tiny",
      paragraph(1, 22),
      "## Also tiny",
      paragraph(50, 22),
      "Short tail.",
    ].join("\n\n");
    const chunks = chunkMarkdown(body);

    expectWellFormed(body, chunks);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeGreaterThanOrEqual(minChars);
    }
  });

  it("is deterministic", () => {
    const body = `# Notes\n\n${paragraph(1, 60)}`;
    expect(chunkMarkdown(body)).toEqual(chunkMarkdown(body));
  });
});
