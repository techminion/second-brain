import { SearchRepository } from "@/features/search/search-repository";
import { NotFoundError, ValidationError } from "@/shared/lib/errors";
import {
  clampListLimit,
  decodeCursor,
  encodeCursor,
  uuidPattern,
} from "@/shared/lib/keyset-cursor";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";
import type {
  KnowledgeObjectSummary,
  Paginated,
  PaginationOptions,
  SearchResult,
  Tag,
} from "@/shared/types";

type SearchRepositoryContract = Pick<
  SearchRepository,
  | "getTag"
  | "getTagsForObjects"
  | "listObjectsByTag"
  | "listTags"
  | "searchNotes"
  | "suggestNoteTitles"
>;

const defaultSuggestionLimit = 10;
const maxSuggestionQueryLength = 200;
const maxSearchQueryLength = 500;
/** Deepest page reachable by offset; far past any real reading depth. */
const maxSearchOffset = 10_000;

// Full-text results are ranked, so the cursor is an opaque offset into a
// fully deterministic order (score, then recency, then id) rather than a
// float-valued keyset that could drift across JSON round-trips (FTS-10).
function encodeOffsetCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), "utf8").toString("base64url");
}

function decodeOffsetCursor(cursor: string | undefined): number {
  if (typeof cursor !== "string" || cursor.length === 0 || cursor.length > 64) {
    return 0;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const offset =
      parsed && typeof parsed === "object" && "o" in parsed ? (parsed as { o: unknown }).o : 0;
    return Number.isSafeInteger(offset) && (offset as number) > 0
      ? Math.min(offset as number, maxSearchOffset)
      : 0;
  } catch {
    return 0;
  }
}

/**
 * SearchService (05_API §6). Implemented so far: full-text search (FTS-01..03,
 * FR-SEARCH-1..3), tag browsing (TAG-02, FR-TAG-3) and title suggestions
 * (SRCH-06). `search` is full-text only until SEM-04 adds the semantic branch
 * and the RRF merge (08_SEARCH §4).
 */
export class SearchService {
  constructor(private readonly repository: SearchRepositoryContract) {}

  /**
   * Title suggestions for `[[` autocomplete and quick-open (FR-LINK-3,
   * 08_SEARCH §6): trigram match on active note titles only — prefix, then
   * substring, then fuzzy. Declares no errors: a blank query returns nothing.
   */
  async suggestNoteTitles(
    userId: string,
    partialTitle: string,
    limit: number = defaultSuggestionLimit,
  ): Promise<KnowledgeObjectSummary[]> {
    const query = typeof partialTitle === "string" ? partialTitle.trim() : "";

    if (query.length === 0) {
      return [];
    }

    const bounded = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 50) : 10;
    return this.repository.suggestNoteTitles(
      userId,
      query.slice(0, maxSuggestionQueryLength),
      bounded,
    );
  }

  /**
   * Full-text search over the caller's active notes (FR-SEARCH-1..3). The
   * query uses web-search syntax — `"exact phrase"`, `-exclude`, `or` — and
   * results carry a snippet with matched terms delimited by the snippet
   * markers (FR-SEARCH-2). A query of only stop words matches nothing.
   */
  async search(
    userId: string,
    query: string,
    options: PaginationOptions = {},
  ): Promise<Paginated<SearchResult>> {
    const text = typeof query === "string" ? query.trim() : "";
    if (text.length === 0) {
      throw new ValidationError("Search query must not be empty");
    }

    const limit = clampListLimit(options.limit);
    const offset = decodeOffsetCursor(options.cursor);
    const hits = await this.repository.searchNotes(userId, text.slice(0, maxSearchQueryLength), {
      limit: limit + 1,
      offset,
    });

    const page = hits.slice(0, limit);
    const tags = await this.repository.getTagsForObjects(
      userId,
      page.map((hit) => hit.id),
    );
    const items = page.map<SearchResult>((hit) => ({
      matchType: "fulltext",
      object: {
        createdAt: hit.createdAt,
        id: hit.id,
        tags: tags.get(hit.id) ?? [],
        title: hit.title,
        type: "note",
        updatedAt: hit.updatedAt,
      },
      score: hit.score,
      snippet: hit.snippet,
    }));

    const nextOffset = offset + limit;
    return hits.length > limit && nextOffset <= maxSearchOffset
      ? { items, nextCursor: encodeOffsetCursor(nextOffset) }
      : { items };
  }

  /** Every tag the caller owns, by name. */
  async listTags(userId: string): Promise<Tag[]> {
    return this.repository.listTags(userId);
  }

  /** Active objects with the tag, newest-edited first; unknown tag → NotFound. */
  async listByTag(
    userId: string,
    tagId: string,
    options: PaginationOptions = {},
  ): Promise<Paginated<KnowledgeObjectSummary>> {
    const tag = uuidPattern.test(tagId) ? await this.repository.getTag(userId, tagId) : null;

    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    const limit = clampListLimit(options.limit);
    const decoded = decodeCursor(options.cursor);
    const records = await this.repository.listObjectsByTag(userId, tagId, {
      keysetBefore: decoded
        ? { idBefore: decoded.id, updatedAtBefore: decoded.timestamp }
        : undefined,
      limit: limit + 1,
    });

    const items = records.slice(0, limit);
    const last = items[items.length - 1];

    return records.length > limit && last
      ? { items, nextCursor: encodeCursor(last.id, last.updatedAt) }
      : { items };
  }
}

export async function createSearchService(): Promise<SearchService> {
  const client = await createServerActionSupabaseClient();
  return new SearchService(new SearchRepository(client));
}
