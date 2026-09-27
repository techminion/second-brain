import type { SupabaseClient } from "@supabase/supabase-js";

import type { FolderRecord } from "@/features/folders/types";

const folderSelect = "id, owner_id, parent_folder_id, name, created_at, updated_at, deleted_at";

interface FolderRow {
  created_at: string;
  deleted_at: string | null;
  id: string;
  name: string;
  owner_id: string;
  parent_folder_id: string | null;
  updated_at: string;
}

function mapFolderRow(row: FolderRow): FolderRecord {
  return {
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    parentFolderId: row.parent_folder_id,
    updatedAt: row.updated_at,
  };
}

/**
 * Owner-scoped data access for `folders` (04_DATABASE §4.5). Every read and
 * write filters `owner_id` and `deleted_at IS NULL` (§6); RLS is the floor.
 */
export class FolderRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createFolder(
    userId: string,
    input: { name: string; parentFolderId: string | null },
  ): Promise<FolderRecord> {
    const { data, error } = await this.client
      .from("folders")
      .insert({ name: input.name, owner_id: userId, parent_folder_id: input.parentFolderId })
      .select(folderSelect)
      .single();

    if (error || !data) {
      throw new Error("Unable to create folder", { cause: error ?? undefined });
    }

    return mapFolderRow(data as FolderRow);
  }

  async getFolder(userId: string, folderId: string): Promise<FolderRecord | null> {
    const { data, error } = await this.client
      .from("folders")
      .select(folderSelect)
      .eq("id", folderId)
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error("Unable to read folder", { cause: error });
    }

    return data ? mapFolderRow(data as FolderRow) : null;
  }

  /** Every active folder the owner has — the tree is small and read whole. */
  async listFolders(userId: string): Promise<FolderRecord[]> {
    const { data, error } = await this.client
      .from("folders")
      .select(folderSelect)
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error("Unable to list folders", { cause: error });
    }

    return (data as FolderRow[]).map(mapFolderRow);
  }

  async updateFolder(
    userId: string,
    folderId: string,
    patch: { name?: string; parentFolderId?: string | null },
  ): Promise<FolderRecord | null> {
    const values: Record<string, string | null> = { updated_at: new Date().toISOString() };

    if (patch.name !== undefined) {
      values.name = patch.name;
    }

    if (patch.parentFolderId !== undefined) {
      values.parent_folder_id = patch.parentFolderId;
    }

    const { data, error } = await this.client
      .from("folders")
      .update(values)
      .eq("id", folderId)
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .select(folderSelect)
      .maybeSingle();

    if (error) {
      throw new Error("Unable to update folder", { cause: error });
    }

    return data ? mapFolderRow(data as FolderRow) : null;
  }

  /** Re-parent every active direct child of `folderId`. */
  async reparentChildren(
    userId: string,
    folderId: string,
    newParentFolderId: string | null,
  ): Promise<void> {
    const { error } = await this.client
      .from("folders")
      .update({ parent_folder_id: newParentFolderId, updated_at: new Date().toISOString() })
      .eq("owner_id", userId)
      .eq("parent_folder_id", folderId)
      .is("deleted_at", null);

    if (error) {
      throw new Error("Unable to re-parent child folders", { cause: error });
    }
  }

  /** Soft-delete the given active folders; the retention purge removes them later. */
  async softDeleteFolders(userId: string, folderIds: string[], deletedAt: string): Promise<void> {
    if (folderIds.length === 0) {
      return;
    }

    const { error } = await this.client
      .from("folders")
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq("owner_id", userId)
      .in("id", folderIds)
      .is("deleted_at", null);

    if (error) {
      throw new Error("Unable to soft-delete folders", { cause: error });
    }
  }
}
