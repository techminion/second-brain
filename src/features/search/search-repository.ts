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
}
