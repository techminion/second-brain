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

type SearchRepositoryContract = Pick<SearchRepository, "getTag" | "listObjectsByTag" | "listTags">;

/**
 * SearchService (05_API §6). This slice implements tag browsing
 * (TAG-02, FR-TAG-3); full-text/semantic search and title suggestions arrive
 * with the FTS/SEM/SRCH tasks.
 */
export class SearchService {
  constructor(private readonly repository: SearchRepositoryContract) {}

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
