// Wiki-link parsing (LINK-01, FR-LINK-1). Pure and dependency-free: the
// service extracts link targets at save time, and the editor/backlink snippet
// code reuses the same rules so every surface agrees on what a link is.
//
// Rules (ADR-32): a link is `[[Title]]` on one line, with a non-empty trimmed
// title that contains no `[`, `]` or line break. There is no alias syntax in
// MVP (`|` is part of the title). Links inside fenced code blocks and inline
// code spans are not links.

export interface WikiLinkMatch {
  /** Trimmed target title. */
  title: string;
  /** Offset of the opening `[[` in the source string. */
  start: number;
  /** Offset just past the closing `]]`. */
  end: number;
}

const wikiLinkPattern = /\[\[([^[\]\n]+)\]\]/g;
const fencePattern = /^ {0,3}(`{3,}|~{3,})/;

/** Replace code (fenced blocks, inline spans) with spaces, preserving offsets. */
function maskCode(markdown: string): string {
  const lines = markdown.split("\n");
  let fence: string | null = null;

  const masked = lines.map((line) => {
    const fenceMatch = fencePattern.exec(line);

    if (fence !== null) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) {
        fence = null;
      }
      return " ".repeat(line.length);
    }

    if (fenceMatch) {
      fence = fenceMatch[1];
      return " ".repeat(line.length);
    }

    // Inline code: a run of N backticks closes at the next run of exactly N.
    return line.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (span) => " ".repeat(span.length));
  });

  return masked.join("\n");
}

/** Every wiki link in document order, with offsets into the original text. */
export function findWikiLinks(markdown: string): WikiLinkMatch[] {
  const masked = maskCode(markdown);
  const matches: WikiLinkMatch[] = [];

  for (const match of masked.matchAll(wikiLinkPattern)) {
    const title = match[1].trim();
    if (title.length > 0 && match.index !== undefined) {
      matches.push({ end: match.index + match[0].length, start: match.index, title });
    }
  }

  return matches;
}

/**
 * Distinct link targets (case-insensitive; first spelling wins), in document
 * order — the input to save-time resolution (LINK-02).
 */
export function extractWikiLinkTitles(markdown: string): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];

  for (const { title } of findWikiLinks(markdown)) {
    const key = title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      titles.push(title);
    }
  }

  return titles;
}

/**
 * Context around the first link to `title` in `markdown` (backlinks panel,
 * 05_API §4 `getBacklinks`): up to `radius` characters each side, whitespace
 * collapsed, with ellipses where text was cut.
 */
export function wikiLinkSnippet(markdown: string, title: string, radius = 60): string {
  const target = title.trim().toLowerCase();
  const link = findWikiLinks(markdown).find((match) => match.title.toLowerCase() === target);

  if (!link) {
    return "";
  }

  const from = Math.max(0, link.start - radius);
  const to = Math.min(markdown.length, link.end + radius);
  const body = markdown.slice(from, to).replace(/\s+/g, " ").trim();

  return `${from > 0 ? "…" : ""}${body}${to < markdown.length ? "…" : ""}`;
}
