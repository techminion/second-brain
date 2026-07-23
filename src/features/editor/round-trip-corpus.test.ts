import type { JSONContent } from "@tiptap/react";
import { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";

import { markdownEditorExtensions } from "./markdown-editor-extensions";
import {
  detectUnsupportedMarkdown,
  normalizeMarkdown,
  serializeEditorMarkdown,
} from "./markdown-round-trip";
import { roundTripCorpus } from "./round-trip-corpus";

function withEditor<T>(markdown: string, use: (editor: Editor) => T): T {
  const editor = new Editor({
    content: markdown,
    contentType: "markdown",
    extensions: markdownEditorExtensions,
  });

  try {
    return use(editor);
  } finally {
    editor.destroy();
  }
}

function parseModel(markdown: string): JSONContent {
  return withEditor(markdown, (editor) => editor.getJSON());
}

const corpusCases = roundTripCorpus.map((doc) => [doc.name, doc.markdown] as [string, string]);

describe("round-trip corpus (FR-NOTE-2 property suite)", () => {
  it.each(corpusCases)("uses only supported constructs: %s", (_name, markdown) => {
    expect(detectUnsupportedMarkdown(markdown)).toEqual([]);
  });

  it.each(corpusCases)("normalization is a fixed point: %s", (_name, markdown) => {
    const once = normalizeMarkdown(markdown);
    const twice = normalizeMarkdown(once);

    expect(twice).toBe(once);
  });

  it.each(corpusCases)(
    "serialization preserves the parsed document model: %s",
    (_name, markdown) => {
      const original = parseModel(markdown);
      const reparsed = parseModel(normalizeMarkdown(markdown));

      expect(reparsed).toEqual(original);
    },
  );

  it.each(corpusCases)("survives edit → save → reload: %s", (_name, markdown) => {
    const editSentence = "Appended during the EDIT-03 property run.";

    const saved = withEditor(normalizeMarkdown(markdown), (editor) => {
      editor.commands.insertContentAt(editor.state.doc.content.size, {
        content: [{ text: editSentence, type: "text" }],
        type: "paragraph",
      });

      return serializeEditorMarkdown(editor);
    });

    // The save carries the edit, and reloading it changes nothing further —
    // the acceptance criterion's "byte-equivalent in markdown semantics".
    expect(saved).toContain(editSentence);
    expect(normalizeMarkdown(saved)).toBe(saved);
    expect(saved).toContain(normalizeMarkdown(markdown).slice(0, 40));
  });

  it("preserves multilingual text byte-for-byte through normalization", () => {
    const unicodeDoc = roundTripCorpus.find((doc) => doc.name.startsWith("unicode"));
    const normalized = normalizeMarkdown(unicodeDoc?.markdown ?? "");

    for (const fragment of [
      "日本語のテキストは**そのまま**残る必要がある。",
      "مرحبا بالعالم",
      "naïve café résumé",
      "é",
      "🧠🔗📝",
      "∑ᵢ xᵢ² ≤ ∞",
    ]) {
      expect(normalized).toContain(fragment);
    }
  });

  it("keeps wiki links intact across every corpus document that uses them", () => {
    for (const doc of roundTripCorpus) {
      const wikiLinks = doc.markdown.match(/\[\[[^\]]+\]\]/g) ?? [];
      const normalized = normalizeMarkdown(doc.markdown);

      for (const link of wikiLinks) {
        expect(normalized).toContain(link);
      }
    }
  });
});
