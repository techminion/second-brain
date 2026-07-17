import type { SupabaseClient } from "@supabase/supabase-js";

import { retentionPurgeBatchSize, retentionWindowDays } from "@/features/retention/constants";
import type { ExpiredKnowledgeObjectRow } from "@/features/retention/types";

interface AttachmentPathRow {
  storage_path: string;
}

interface KnowledgeObjectQueryRow {
  // PostgREST returns a 1:1 embed as an object; keep the array shape tolerated
  // defensively in case the relationship detection ever changes.
  attachments: AttachmentPathRow | AttachmentPathRow[] | null;
  id: string;
  type: "attachment" | "note";
}

function getEmbeddedStoragePath(
  attachments: KnowledgeObjectQueryRow["attachments"],
): string | null {
  if (attachments === null) {
    return null;
  }

  if (Array.isArray(attachments)) {
    return attachments[0]?.storage_path ?? null;
  }

  return attachments.storage_path;
}

function getRetentionCutoffIso(): string {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionWindowDays);

  return cutoff.toISOString();
}

function isStorageObjectMissingError(error: { message?: string } | null): boolean {
  if (!error?.message) {
    return false;
  }

  const message = error.message.toLowerCase();

  return message.includes("not found") || message.includes("object not found");
}

export class RetentionPurgeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listExpiredKnowledgeObjects(): Promise<ExpiredKnowledgeObjectRow[]> {
    const { data, error } = await this.client
      .from("knowledge_objects")
      .select("id, type, attachments(storage_path)")
      .not("deleted_at", "is", null)
      .lt("deleted_at", getRetentionCutoffIso())
      .order("deleted_at", { ascending: true })
      .limit(retentionPurgeBatchSize);

    if (error) {
      throw new Error("Unable to list expired knowledge objects for retention purge", {
        cause: error,
      });
    }

    return (data as KnowledgeObjectQueryRow[]).map((row) => ({
      id: row.id,
      storagePath: getEmbeddedStoragePath(row.attachments),
      type: row.type,
    }));
  }

  async listExpiredFolderIds(): Promise<string[]> {
    const { data, error } = await this.client
      .from("folders")
      .select("id")
      .not("deleted_at", "is", null)
      .lt("deleted_at", getRetentionCutoffIso())
      .order("deleted_at", { ascending: true })
      .limit(retentionPurgeBatchSize);

    if (error) {
      throw new Error("Unable to list expired folders for retention purge", { cause: error });
    }

    return data.map((row) => row.id);
  }

  async deleteStorageObject(storagePath: string): Promise<boolean> {
    const { error } = await this.client.storage.from("attachments").remove([storagePath]);

    if (error) {
      // A missing binary means a prior partial run already removed it.
      return isStorageObjectMissingError(error);
    }

    // Storage remove succeeds (possibly with an empty payload) once the object is gone,
    // so a non-error response always counts as deleted.
    return true;
  }

  async deleteKnowledgeObject(knowledgeObjectId: string): Promise<void> {
    const { error } = await this.client
      .from("knowledge_objects")
      .delete()
      .eq("id", knowledgeObjectId);

    if (error) {
      throw new Error("Unable to delete expired knowledge object during retention purge", {
        cause: error,
      });
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    const { error } = await this.client.from("folders").delete().eq("id", folderId);

    if (error) {
      throw new Error("Unable to delete expired folder during retention purge", { cause: error });
    }
  }
}
