import type { KnowledgeObjectSummary } from "./knowledge-object";

/** How a search hit was found (05_API §2); "fulltext" until SEM-04 adds the rest. */
export type SearchMatchType = "fulltext" | "hybrid" | "semantic";

/**
 * One search hit (05_API §2). `snippet` is plain text in which each matched
 * term is wrapped in {@link snippetMatchStart} / {@link snippetMatchEnd}
 * (U+0002 / U+0003) — never HTML — so renderers split on the markers and
 * emit their own `<mark>` elements (FR-SEARCH-2, 09_SECURITY T4).
 */
export interface SearchResult {
  object: KnowledgeObjectSummary;
  snippet: string;
  score: number;
  matchType: SearchMatchType;
}

export const snippetMatchStart = "\u0002";
export const snippetMatchEnd = "\u0003";
