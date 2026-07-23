import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RetentionPurgeRepository } from "@/features/retention/retention-purge-repository";
import { RetentionPurgeService } from "@/features/retention/retention-purge-service";
import type { ExpiredKnowledgeObjectRow } from "@/features/retention/types";

interface MockRetentionPurgeRepository {
  deleteAuthUser: ReturnType<typeof vi.fn>;
  deleteFolder: ReturnType<typeof vi.fn>;
  deleteKnowledgeObject: ReturnType<typeof vi.fn>;
  deleteStorageObject: ReturnType<typeof vi.fn>;
  listExpiredAccountIds: ReturnType<typeof vi.fn>;
  listExpiredFolderIds: ReturnType<typeof vi.fn>;
  listExpiredKnowledgeObjects: ReturnType<typeof vi.fn>;
}

function createRepositoryMock(): MockRetentionPurgeRepository {
  return {
    deleteAuthUser: vi.fn().mockResolvedValue(undefined),
    deleteFolder: vi.fn(),
    deleteKnowledgeObject: vi.fn(),
    deleteStorageObject: vi.fn(),
    listExpiredAccountIds: vi.fn().mockResolvedValue([]),
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
      accountsDeleted: 0,
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
      accountsDeleted: 0,
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
      accountsDeleted: 0,
      foldersPurged: 1,
      knowledgeObjectsPurged: 1,
      storageObjectsRemoved: 0,
    });

    expect(repository.deleteFolder).toHaveBeenCalledWith("folder-id");
  });

  it("deletes expired auth users and counts them in the result", async () => {
    repository.listExpiredKnowledgeObjects.mockResolvedValue([]);
    repository.listExpiredFolderIds.mockResolvedValue([]);
    repository.listExpiredAccountIds.mockResolvedValue(["user-a", "user-b"]);

    await expect(service.run()).resolves.toEqual({
      accountsDeleted: 2,
      foldersPurged: 0,
      knowledgeObjectsPurged: 0,
      storageObjectsRemoved: 0,
    });

    expect(repository.deleteAuthUser).toHaveBeenCalledWith("user-a");
    expect(repository.deleteAuthUser).toHaveBeenCalledWith("user-b");
  });

  it("deletes knowledge objects and folders before auth users", async () => {
    const callOrder: string[] = [];
    repository.listExpiredKnowledgeObjects.mockResolvedValue([
      { id: "note-id", storagePath: null, type: "note" },
    ]);
    repository.listExpiredFolderIds.mockResolvedValue(["folder-id"]);
    repository.listExpiredAccountIds.mockResolvedValue(["user-id"]);
    repository.deleteKnowledgeObject.mockImplementation(async () => {
      callOrder.push("deleteKnowledgeObject");
    });
    repository.deleteFolder.mockImplementation(async () => {
      callOrder.push("deleteFolder");
    });
    repository.deleteAuthUser.mockImplementation(async () => {
      callOrder.push("deleteAuthUser");
    });

    await service.run();

    expect(callOrder.indexOf("deleteKnowledgeObject")).toBeLessThan(
      callOrder.indexOf("deleteAuthUser"),
    );
    expect(callOrder.indexOf("deleteFolder")).toBeLessThan(callOrder.indexOf("deleteAuthUser"));
  });
});
