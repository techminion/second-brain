import type { SupabaseClient } from "@supabase/supabase-js";

import type { KnowledgeObjectSummary, KnowledgeObjectType, Tag } from "@/shared/types";

export interface ObjectKeyset {
  idBefore: string;
  updatedAtBefore: string;
}

interface TagJoinRow {
  tags: Tag | Tag[] | null;
}

interface TaggedObjectRow {
  created_at: string;
  id: string;
  knowledge_object_tags: TagJoinRow[] | null;
  title: string;
  type: KnowledgeObjectType;
  updated_at: string;
}

function mapTags(rows: TagJoinRow[] | null): Tag[] {
  return (rows ?? [])
    .flatMap((row) => (Array.isArray(row.tags) ? row.tags : row.tags ? [row.tags] : []))
    .map((tag) => ({ id: tag.id, name: tag.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface FullTextHit {
  createdAt: string;
  id: string;
  score: number;
  snippet: string;
  title: string;
  updatedAt: string;
}

interface FullTextRow {
  created_at: string;
  id: string;
  score: number;
  snippet: string;
  title: string;
  updated_at: string;
}

/**
 * Read-only discovery queries (05_API §6). Owner-scoped and soft-delete
 * filtered at the query level; RLS is the floor.
 */
export class SearchRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listTags(userId: string): Promise<Tag[]> {
    const { data, error } = await this.client
      .from("tags")
      .select("id, name")
      .eq("owner_id", userId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error("Unable to list tags", { cause: error });
    }

    return (data as Tag[]).map((tag) => ({ id: tag.id, name: tag.name }));
  }

  async getTag(userId: string, tagId: string): Promise<Tag | null> {
    const { data, error } = await this.client
      .from("tags")
      .select("id, name")
      .eq("owner_id", userId)
      .eq("id", tagId)
      .maybeSingle();

    if (error) {
      throw new Error("Unable to read tag", { cause: error });
    }

    return (data as Tag | null) ?? null;
  }

  /**
   * Active objects carrying `tagId`, across folders and types (FR-TAG-3),
   * newest-edited first. `tag_filter` is an aliased inner embed used only to
   * filter; `knowledge_object_tags` carries every tag for display.
   */
  async listObjectsByTag(
    userId: string,
    tagId: string,
    options: { keysetBefore?: ObjectKeyset; limit: number },
  ): Promise<KnowledgeObjectSummary[]> {
    let query = this.client
      .from("knowledge_objects")
      .select(
        "id, type, title, created_at, updated_at, tag_filter:knowledge_object_tags!inner(tag_id), knowledge_object_tags(tags(id, name))",
      )
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .eq("tag_filter.tag_id", tagId);

    if (options.keysetBefore) {
      const { idBefore, updatedAtBefore } = options.keysetBefore;
      query = query.or(
        `updated_at.lt."${updatedAtBefore}",and(updated_at.eq."${updatedAtBefore}",id.lt."${idBefore}")`,
      );
    }

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(options.limit);

    if (error) {
      throw new Error("Unable to list objects by tag", { cause: error });
    }

    return (data as TaggedObjectRow[]).map((row) => ({
      createdAt: row.created_at,
      id: row.id,
      tags: mapTags(row.knowledge_object_tags),
      title: row.title,
      type: row.type,
      updatedAt: row.updated_at,
    }));
  }

  /** Trigram title suggestions via the `suggest_note_titles` RPC (SRCH-06). */
  async suggestNoteTitles(
    userId: string,
    query: string,
    limit: number,
  ): Promise<KnowledgeObjectSummary[]> {
    const { data, error } = await this.client.rpc("suggest_note_titles", {
      p_limit: limit,
      p_owner_id: userId,
      p_query: query,
    });

    if (error) {
      throw new Error("Unable to suggest note titles", { cause: error });
    }

    return (data as { created_at: string; id: string; title: string; updated_at: string }[]).map(
      (row) => ({
        createdAt: row.created_at,
        id: row.id,
        tags: [],
        title: row.title,
        type: "note" as const,
        updatedAt: row.updated_at,
      }),
    );
  }

  /**
   * One page of full-text hits via the `search_notes` RPC (FTS-01/02):
   * websearch syntax, `ts_rank_cd` order with deterministic tie-breaks, and
   * marker-delimited `ts_headline` snippets. Active owned notes only.
   */
  async searchNotes(
    userId: string,
    query: string,
    options: { limit: number; offset: number },
  ): Promise<FullTextHit[]> {
    const { data, error } = await this.client.rpc("search_notes", {
      p_limit: options.limit,
      p_offset: options.offset,
      p_owner_id: userId,
      p_query: query,
    });

    if (error) {
      throw new Error("Unable to search notes", { cause: error });
    }

    return (data as FullTextRow[]).map((row) => ({
      createdAt: row.created_at,
      id: row.id,
      score: row.score,
      snippet: row.snippet,
      title: row.title,
      updatedAt: row.updated_at,
    }));
  }

  /** Tags for a set of objects, keyed by object id, each list sorted by name. */
  async getTagsForObjects(userId: string, objectIds: string[]): Promise<Map<string, Tag[]>> {
    const tagsByObject = new Map<string, Tag[]>();
    if (objectIds.length === 0) {
      return tagsByObject;
    }

    const { data, error } = await this.client
      .from("knowledge_object_tags")
      .select("knowledge_object_id, tags(id, name)")
      .eq("owner_id", userId)
      .in("knowledge_object_id", objectIds);

    if (error) {
      throw new Error("Unable to read tags for search results", { cause: error });
    }

    for (const row of data as ({ knowledge_object_id: string } & TagJoinRow)[]) {
      const existing = tagsByObject.get(row.knowledge_object_id) ?? [];
      tagsByObject.set(row.knowledge_object_id, [...existing, ...mapTags([row])]);
    }
    for (const [id, tags] of tagsByObject) {
      tagsByObject.set(
        id,
        tags.sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
    return tagsByObject;
  }
}
