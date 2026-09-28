import type { SupabaseClient } from "@supabase/supabase-js";

import type { GraphEdge, GraphNodeRecord } from "@/features/graph/types";
import type { KnowledgeObjectType } from "@/shared/types";

interface NodeRow {
  id: string;
  knowledge_object_tags: { tag_id: string }[] | null;
  notes: { folder_id: string | null } | { folder_id: string | null }[] | null;
  title: string;
  type: KnowledgeObjectType;
}

/**
 * Structural reads over the shared envelope + `links` (05_API §12 rule 1:
 * GraphService reads `knowledge_objects`/`links` directly). Active objects
 * only; RLS scopes rows to the owner.
 */
export class GraphRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listNodes(userId: string): Promise<GraphNodeRecord[]> {
    const { data, error } = await this.client
      .from("knowledge_objects")
      .select("id, type, title, notes(folder_id), knowledge_object_tags(tag_id)")
      .eq("owner_id", userId)
      .eq("type", "note")
      .is("deleted_at", null);

    if (error) {
      throw new Error("Unable to list graph nodes", { cause: error });
    }

    return (data as NodeRow[]).map((row) => {
      const note = Array.isArray(row.notes) ? row.notes[0] : row.notes;
      return {
        folderId: note?.folder_id ?? null,
        id: row.id,
        tagIds: (row.knowledge_object_tags ?? []).map((tag) => tag.tag_id),
        title: row.title,
        type: row.type,
      };
    });
  }

  async listEdges(userId: string): Promise<GraphEdge[]> {
    const { data, error } = await this.client
      .from("links")
      .select("source_object_id, target_object_id")
      .eq("owner_id", userId);

    if (error) {
      throw new Error("Unable to list graph edges", { cause: error });
    }

    return (data as { source_object_id: string; target_object_id: string }[]).map((row) => ({
      sourceId: row.source_object_id,
      targetId: row.target_object_id,
    }));
  }
}
