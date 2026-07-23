import type { Editor } from "@tiptap/react";
import { Editor as TiptapEditor } from "@tiptap/react";

import { markdownEditorExtensions } from "./markdown-editor-extensions";

export type UnsupportedMarkdownReason = "html" | "table" | "task-list";

// `[[wiki links]]` are plain text to the editor model, so the markdown
// serializer escapes their brackets. That escaping would corrupt the graph's
// core link syntax (FR-LINK) on every save, so it is reversed after
// serialization. A future dedicated wiki-link node replaces this repair.
function repairWikiLinkEscapes(markdown: string): string {
  return markdown.replaceAll("\\[\\[", "[[").replaceAll("\\]\\]", "]]");
}

/**
 * Serialize an editor's current document to markdown. This is the only
 * sanctioned path from editor state to persisted markdown — using
 * `editor.getMarkdown()` directly skips the wiki-link escape repair.
 */
export function serializeEditorMarkdown(editor: Editor): string {
  return repairWikiLinkEscapes(editor.getMarkdown());
}

/**
 * One parse → serialize pass through the editor document model. The result is
 * the canonical form: running it twice is a fixed point (verified in tests),
 * so a note body converges after its first save and never drifts again.
 */
export function normalizeMarkdown(markdown: string): string {
  const editor = new TiptapEditor({
    content: markdown,
    contentType: "markdown",
    extensions: markdownEditorExtensions,
  });

  try {
    return serializeEditorMarkdown(editor);
  } finally {
    editor.destroy();
  }
}

const unsupportedPatterns: readonly [UnsupportedMarkdownReason, RegExp][] = [
  // A table delimiter row (`|---|---|`) marks GFM table structure the editor
  // flattens today; tables arrive with EDIT-07.
  ["table", /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{0,}:?\s*\|?\s*$/m],
  // Task-list checkboxes are dropped by the current schema; EDIT-05 adds them.
  ["task-list", /^\s*[-*+]\s+\[[ xX]\]\s/m],
  // Raw HTML tags are stripped on parse. The pattern requires a tag-shaped
  // token so `<https://autolink>` stays clean.
  ["html", /<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^>]*)?\/?>/],
];

/**
 * Report markdown constructs the current editor schema cannot represent
 * without loss. Callers that persist editor output (autosave, note routes)
 * must treat a non-empty result as "do not round-trip this body through the
 * rich editor" and fall back to plain-text editing — this is the FR-NOTE-2
 * loss guard until EDIT-05/07 close the construct gaps.
 */
export function detectUnsupportedMarkdown(markdown: string): UnsupportedMarkdownReason[] {
  return unsupportedPatterns
    .filter(([, pattern]) => pattern.test(markdown))
    .map(([reason]) => reason);
}
