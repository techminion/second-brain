import { describe, expect, it } from "vitest";

import { RetentionPurgeRepository } from "../../src/features/retention/retention-purge-repository";
import { RetentionPurgeService } from "../../src/features/retention/retention-purge-service";
import {
  createCloudIntegrationTestHarness,
  createServiceRoleTestClient,
} from "./supabase-test-harness";

const expiredDeletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

describe("retention purge (ADR-18)", () => {
  const { userA } = createCloudIntegrationTestHarness();
  const serviceRoleClient = createServiceRoleTestClient();

  it("purges expired objects, folders, and binaries while sparing unexpired rows", async () => {
    const { data: expiredNote, error: expiredNoteError } = await userA.client
      .from("knowledge_objects")
      .insert({
        deleted_at: expiredDeletedAt,
        owner_id: userA.id,
        title: "Expired note",
        type: "note",
      })
      .select("id")
      .single();

    expect(expiredNoteError).toBeNull();

    const { data: freshNote, error: freshNoteError } = await userA.client
      .from("knowledge_objects")
      .insert({
        deleted_at: new Date().toISOString(),
        owner_id: userA.id,
        title: "Recently trashed note",
        type: "note",
      })
      .select("id")
      .single();

    expect(freshNoteError).toBeNull();

    const { data: expiredAttachment, error: expiredAttachmentError } = await userA.client
      .from("knowledge_objects")
      .insert({
        deleted_at: expiredDeletedAt,
        owner_id: userA.id,
        title: "Expired attachment",
        type: "attachment",
      })
      .select("id")
      .single();

    expect(expiredAttachmentError).toBeNull();

    if (!expiredNote || !freshNote || !expiredAttachment) {
      throw new Error("Expected the harness user to create purge fixtures");
    }

    const storagePath = `${userA.id}/${expiredAttachment.id}/expired.txt`;
    const { error: attachmentRowError } = await userA.client.from("attachments").insert({
      knowledge_object_id: expiredAttachment.id,
      mime_type: "text/plain",
      owner_id: userA.id,
      size_bytes: 11,
      storage_path: storagePath,
    });

    expect(attachmentRowError).toBeNull();

    const { error: uploadError } = await userA.client.storage
      .from("attachments")
      .upload(storagePath, new Blob(["expired old"]), { contentType: "text/plain" });

    expect(uploadError).toBeNull();

    const { data: expiredFolder, error: expiredFolderError } = await userA.client
      .from("folders")
      .insert({ deleted_at: expiredDeletedAt, name: "Expired folder", owner_id: userA.id })
      .select("id")
      .single();

    expect(expiredFolderError).toBeNull();

    if (!expiredFolder) {
      throw new Error("Expected the harness user to create an expired folder");
    }

    const { data: childFolder, error: childFolderError } = await userA.client
      .from("folders")
      .insert({
        name: "Surviving child",
        owner_id: userA.id,
        parent_folder_id: expiredFolder.id,
      })
      .select("id")
      .single();

    expect(childFolderError).toBeNull();

    if (!childFolder) {
      throw new Error("Expected the harness user to create a child folder");
    }

    const service = new RetentionPurgeService(new RetentionPurgeRepository(serviceRoleClient));
    const result = await service.run();

    expect(result.knowledgeObjectsPurged).toBeGreaterThanOrEqual(2);
    expect(result.storageObjectsRemoved).toBeGreaterThanOrEqual(1);
    expect(result.foldersPurged).toBeGreaterThanOrEqual(1);

    const { data: purgedRows, error: purgedReadError } = await userA.client
      .from("knowledge_objects")
      .select("id")
      .in("id", [expiredNote.id, expiredAttachment.id]);

    expect(purgedReadError).toBeNull();
    expect(purgedRows).toEqual([]);

    const { data: survivingNote, error: survivingReadError } = await userA.client
      .from("knowledge_objects")
      .select("id")
      .eq("id", freshNote.id)
      .single();

    expect(survivingReadError).toBeNull();
    expect(survivingNote).toEqual({ id: freshNote.id });

    const { data: binaryDownload, error: binaryDownloadError } = await serviceRoleClient.storage
      .from("attachments")
      .download(storagePath);

    expect(binaryDownload).toBeNull();
    expect(binaryDownloadError).not.toBeNull();

    const { data: purgedFolderRows, error: purgedFolderReadError } = await userA.client
      .from("folders")
      .select("id")
      .eq("id", expiredFolder.id);

    expect(purgedFolderReadError).toBeNull();
    expect(purgedFolderRows).toEqual([]);

    const { data: survivingChild, error: survivingChildError } = await userA.client
      .from("folders")
      .select("parent_folder_id")
      .eq("id", childFolder.id)
      .single();

    expect(survivingChildError).toBeNull();
    expect(survivingChild).toEqual({ parent_folder_id: null });

    const rerunResult = await service.run();

    expect(rerunResult).toEqual({
      accountsDeleted: 0,
      foldersPurged: 0,
      knowledgeObjectsPurged: 0,
      storageObjectsRemoved: 0,
    });
  });
});
