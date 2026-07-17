import { RetentionPurgeRepository } from "@/features/retention/retention-purge-repository";
import type { RetentionPurgeResult } from "@/features/retention/types";
import { createServiceRoleSupabaseClient } from "@/shared/lib/supabase-service-role-client";

export class RetentionPurgeService {
  constructor(private readonly repository: RetentionPurgeRepository) {}

  async run(): Promise<RetentionPurgeResult> {
    let knowledgeObjectsPurged = 0;
    let storageObjectsRemoved = 0;
    let foldersPurged = 0;

    const expiredObjects = await this.repository.listExpiredKnowledgeObjects();

    for (const object of expiredObjects) {
      if (object.type === "attachment" && object.storagePath) {
        const storageDeleted = await this.repository.deleteStorageObject(object.storagePath);

        if (!storageDeleted) {
          continue;
        }

        storageObjectsRemoved += 1;
      }

      await this.repository.deleteKnowledgeObject(object.id);
      knowledgeObjectsPurged += 1;
    }

    const expiredFolderIds = await this.repository.listExpiredFolderIds();

    for (const folderId of expiredFolderIds) {
      await this.repository.deleteFolder(folderId);
      foldersPurged += 1;
    }

    return {
      foldersPurged,
      knowledgeObjectsPurged,
      storageObjectsRemoved,
    };
  }
}

export function createRetentionPurgeService(): RetentionPurgeService {
  return new RetentionPurgeService(new RetentionPurgeRepository(createServiceRoleSupabaseClient()));
}
