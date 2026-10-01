/**
 * Markdown → a single line of readable plain text, for previews (UX-05) and
 * snippets (UX-08). Deliberately lossy and regex-based: it only has to make
 * syntax disappear from a short excerpt, never round-trip. `[[Title]]` keeps
 * its title; links keep their text; code keeps its content.
 */
export function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // Fence lines (```ts / ~~~) — keep the code, drop the fence.
      .replace(/^\s{0,3}(`{3,}|~{3,}).*$/gm, " ")
      // Table separator rows (| --- | :---: |).
      .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, " ")
      // Images, then links: keep the alt/link text.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Wiki links keep their title.
      .replace(/\[\[([^[\]\n]+)\]\]/g, "$1")
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
