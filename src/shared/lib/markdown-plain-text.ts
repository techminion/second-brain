export interface StripInlineMarkdownOptions {
  /**
   * Also strip block syntax that is no longer at a line start, as in a search
   * snippet, where `ts_headline` has turned newlines into spaces (UX-08):
   * headings, quotes, bullets, task boxes and fences that follow whitespace or
   * `…`, plus table separators and rules mid-string, and the dangling `[[`,
   * `]]` and `](url` left where a fragment cut through a link. Ordered-list
   * numbers are only stripped at the start, because "in 2026. Then" is prose.
   * Default false, which is exactly `markdownToPlainText`.
   */
  inlineBlockMarkers?: boolean;
}

// What may precede a block marker that has lost its line start.
const inlineLead = String.raw`(^|[\s…])`;

/**
 * The shared markdown → plain-text rule set (UX-05 previews, UX-08 snippets).
 * Deliberately lossy and regex-based: it only has to make syntax disappear
 * from a short excerpt, never round-trip. `[[Title]]` keeps its title; links
 * keep their text; code keeps its content.
 */
export function stripInlineMarkdown(
  markdown: string,
  { inlineBlockMarkers = false }: StripInlineMarkdownOptions = {},
): string {
  let text = markdown;

  if (inlineBlockMarkers) {
    // Fence runs anywhere (```ts / ~~~), with an attached language word.
    text = text.replace(/(`{3,}|~{3,})[\w+#-]*/g, " ");
  } else {
    // Fence lines (```ts / ~~~) — keep the code, drop the fence.
    text = text.replace(/^\s{0,3}(`{3,}|~{3,}).*$/gm, " ");
  }

  text = text
    // Table separator rows (| --- | :---: |).
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, " ")
    // Images, then links: keep the alt/link text.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Wiki links keep their title.
    .replace(/\[\[([^[\]\n]+)\]\]/g, "$1");

  if (inlineBlockMarkers) {
    text = text
      // Fragment edges: a link cut after its text, and dangling wiki brackets.
      .replace(/\]\([^)\s]*\)?/g, "")
      .replace(/\[\[|\]\]/g, "")
      // Table separators and horizontal rules mid-string.
      .replace(/\|?(\s*:?-{3,}:?\s*\|)+(\s*:?-{3,}:?\s*)?/g, " ")
      .replace(new RegExp(`${inlineLead}([-*_])(\\s*\\2){2,}(?=\\s|$)`, "g"), "$1 ")
      // Headings, quotes, bullets and task boxes that follow whitespace or `…`.
      .replace(new RegExp(`${inlineLead}(#{1,6}\\s+|>\\s?|[-*+]\\s+(\\[[ xX]\\]\\s+)?)`, "g"), "$1")
      .replace(new RegExp(`${inlineLead}\\[[ xX]\\]\\s+`, "g"), "$1");
  }

  return (
    text
      // Line-leading block markers: headings, quotes, lists, task boxes.
      .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+(\[[ xX]\]\s+)?)/gm, "")
      // Horizontal rules.
      .replace(/^\s{0,3}([-*_])(\s*\1){2,}\s*$/gm, " ")
      // Emphasis, strike and code markers.
      .replace(/(\*\*|__|~~|`)/g, "")
      .replace(/(^|[\s(])[*_](\S)/g, "$1$2")
      .replace(/(\S)[*_](?=[\s).,;:!?]|$)/g, "$1")
      // Table pipes.
      .replace(/\s*\|\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Markdown → a single line of readable plain text, for previews (UX-05) and
 * backlink snippets (UX-08). See {@link stripInlineMarkdown}.
 */
export function markdownToPlainText(markdown: string): string {
  return stripInlineMarkdown(markdown);
}
