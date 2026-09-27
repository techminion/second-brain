import { SearchRepository } from "@/features/search/search-repository";
import { NotFoundError } from "@/shared/lib/errors";
import {
  clampListLimit,
  decodeCursor,
  encodeCursor,
  uuidPattern,
} from "@/shared/lib/keyset-cursor";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";
import type { KnowledgeObjectSummary, Paginated, PaginationOptions, Tag } from "@/shared/types";

type SearchRepositoryContract = Pick<
  SearchRepository,
  "getTag" | "listObjectsByTag" | "listTags" | "suggestNoteTitles"
>;

const defaultSuggestionLimit = 10;
const maxSuggestionQueryLength = 200;

/**
 * SearchService (05_API §6). Implemented so far: tag browsing (TAG-02,
 * FR-TAG-3) and title suggestions (SRCH-06); full-text/semantic search arrive
 * with the FTS/SEM tasks.
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
