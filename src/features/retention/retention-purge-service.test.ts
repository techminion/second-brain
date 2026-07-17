import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RetentionPurgeRepository } from "@/features/retention/retention-purge-repository";
import { RetentionPurgeService } from "@/features/retention/retention-purge-service";
import type { ExpiredKnowledgeObjectRow } from "@/features/retention/types";

interface MockRetentionPurgeRepository {
  deleteFolder: ReturnType<typeof vi.fn>;
  deleteKnowledgeObject: ReturnType<typeof vi.fn>;
  deleteStorageObject: ReturnType<typeof vi.fn>;
  listExpiredFolderIds: ReturnType<typeof vi.fn>;
  listExpiredKnowledgeObjects: ReturnType<typeof vi.fn>;
}

function createRepositoryMock(): MockRetentionPurgeRepository {
  return {
    deleteFolder: vi.fn(),
    deleteKnowledgeObject: vi.fn(),
    deleteStorageObject: vi.fn(),
    listExpiredFolderIds: vi.fn(),
    listExpiredKnowledgeObjects: vi.fn(),
  };
}

describe("RetentionPurgeService", () => {
  let repository: MockRetentionPurgeRepository;
  let service: RetentionPurgeService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new RetentionPurgeService(repository as unknown as RetentionPurgeRepository);
  });

  it("deletes attachment storage before removing the envelope row", async () => {
    const expiredAttachment: ExpiredKnowledgeObjectRow = {
      id: "attachment-object-id",
      storagePath: "owner-id/object-id/file.txt",
      type: "attachment",
    };

    repository.listExpiredKnowledgeObjects.mockResolvedValue([expiredAttachment]);
    repository.listExpiredFolderIds.mockResolvedValue([]);
    repository.deleteStorageObject.mockResolvedValue(true);

    await expect(service.run()).resolves.toEqual({
      foldersPurged: 0,
      knowledgeObjectsPurged: 1,
      storageObjectsRemoved: 1,
    });

    expect(repository.deleteStorageObject).toHaveBeenCalledWith(expiredAttachment.storagePath);
    expect(repository.deleteKnowledgeObject).toHaveBeenCalledWith(expiredAttachment.id);
  });

  it("skips envelope deletion when attachment storage deletion fails", async () => {
    repository.listExpiredKnowledgeObjects.mockResolvedValue([
      {
        id: "attachment-object-id",
        storagePath: "owner-id/object-id/file.txt",
        type: "attachment",
      },
    ]);
    repository.listExpiredFolderIds.mockResolvedValue([]);
    repository.deleteStorageObject.mockResolvedValue(false);

    await expect(service.run()).resolves.toEqual({
      foldersPurged: 0,
      knowledgeObjectsPurged: 0,
      storageObjectsRemoved: 0,
    });

    expect(repository.deleteKnowledgeObject).not.toHaveBeenCalled();
  });

  it("purges expired folders after knowledge objects", async () => {
    repository.listExpiredKnowledgeObjects.mockResolvedValue([
      {
        id: "note-object-id",
        storagePath: null,
        type: "note",
      },
    ]);
    repository.listExpiredFolderIds.mockResolvedValue(["folder-id"]);
    repository.deleteKnowledgeObject.mockResolvedValue(undefined);
    repository.deleteFolder.mockResolvedValue(undefined);

    await expect(service.run()).resolves.toEqual({
      foldersPurged: 1,
      knowledgeObjectsPurged: 1,
      storageObjectsRemoved: 0,
    });

    expect(repository.deleteFolder).toHaveBeenCalledWith("folder-id");
  });
});
