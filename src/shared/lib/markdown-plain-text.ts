export interface StripInlineMarkdownOptions {
  /**
   * Also strip block syntax that is no longer at a line start, as in a search
   * snippet, where `ts_headline` has turned newlines into spaces (UX-08):
   * headings and fences that follow whitespace or `…`, table separators and
   * rules mid-string, and the dangling `[[`, `]]` and `](url` left where a
   * fragment cut through a link. Quote, bullet and task markers (` > `,
   * ` - `, ` * `, ` + `, `[ ]`) are only stripped at the start of the text,
   * right after `…`, or right after another stripped marker, because mid-
   * sentence they are usually prose ("Mon - Fri", "2 * 3 > 5"). Ordered-list
   * numbers are only stripped at the start, because "in 2026. Then" is prose.
   * Default false, which is exactly `markdownToPlainText`.
   */
  inlineBlockMarkers?: boolean;
}

// What may precede a heading, fence or rule that has lost its line start.
const inlineLead = String.raw`(^|[\s…])`;
// Quote, bullet and task markers, any number in a row ("> - [ ] item").
const listMarkerRun = String.raw`(?:>\s?|[-*+]\s+|\[[ xX]\]\s+)`;
// A link or image URL: no spaces, at most one level of balanced parentheses
// (https://en.wikipedia.org/wiki/Foo_(bar)).
const linkUrl = String.raw`(?:[^()\s]|\([^()\s]*\))*`;
// Stand-ins for code-span contents while the other rules run.
const codeOpen = "\uE010";
const codeClose = "\uE011";

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

  // Code spans keep their content verbatim (`a * b` stays "a * b"): stash it
  // so the emphasis and table rules can't touch it.
  const codeSpans: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) => {
    codeSpans.push(code);
    return `${codeOpen}${codeSpans.length - 1}${codeClose}`;
  });

  text = text
    // Table separator rows (| --- | :---: |).
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, " ")
    // Images, then links: keep the alt/link text.
    .replace(new RegExp(String.raw`!\[([^\]]*)\]\(${linkUrl}\)`, "g"), "$1")
    .replace(new RegExp(String.raw`\[([^\]]+)\]\(${linkUrl}(?:\s+"[^"]*")?\)`, "g"), "$1")
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
      // Headings after whitespace or `…`, with any markers right after them.
      .replace(new RegExp(`${inlineLead}#{1,6}\\s+${listMarkerRun}*`, "g"), "$1")
      // Quotes, bullets and task boxes only at the start or right after `…`.
      .replace(new RegExp(`(^|…)(\\s*)${listMarkerRun}+`, "g"), "$1$2");
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
      .replace(
        new RegExp(`${codeOpen}(\\d+)${codeClose}`, "g"),
        (_, index: string) => codeSpans[Number(index)]?.replace(/\s+/g, " ") ?? "",
      )
  );
}

/**
 * Markdown → a single line of readable plain text, for previews (UX-05) and
 * backlink snippets (UX-08). See {@link stripInlineMarkdown}.
 */
export function markdownToPlainText(markdown: string): string {
  return stripInlineMarkdown(markdown);
}
