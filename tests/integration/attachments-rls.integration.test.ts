import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("attachments schema, storage, and RLS", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();

  it("enforces owner-only metadata access", async () => {
    const { data: knowledgeObject, error: objectCreateError } = await userA.client
      .from("knowledge_objects")
      .insert({ owner_id: userA.id, title: "Private attachment", type: "attachment" })
      .select("id")
      .single();

    expect(objectCreateError).toBeNull();

    if (!knowledgeObject) {
      throw new Error("Expected the owner to create an attachment envelope");
    }

    const attachment = {
      knowledge_object_id: knowledgeObject.id,
      mime_type: "text/plain",
      owner_id: userA.id,
      size_bytes: 17,
      storage_path: `${userA.id}/${knowledgeObject.id}/private.txt`,
    };
    const { data: createdAttachment, error: attachmentCreateError } = await userA.client
      .from("attachments")
      .insert(attachment)
      .select("knowledge_object_id, mime_type, owner_id, size_bytes, storage_path")
      .single();

    expect(attachmentCreateError).toBeNull();
    expect(createdAttachment).toEqual(attachment);

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("attachments")
      .select("knowledge_object_id")
      .eq("knowledge_object_id", knowledgeObject.id);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("attachments")
      .update({ mime_type: "application/octet-stream" })
      .eq("knowledge_object_id", knowledgeObject.id)
      .select("knowledge_object_id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } = await userB.client
      .from("attachments")
      .delete()
      .eq("knowledge_object_id", knowledgeObject.id)
      .select("knowledge_object_id");

    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: foreignInsertError } = await userB.client.from("attachments").insert(attachment);

    expect(foreignInsertError).toMatchObject({ code: "42501" });
  });

  it("restricts private storage objects to the owner's path", async () => {
    const ownerPath = `${userA.id}/integration-${randomUUID()}.txt`;
    const foreignPath = `${userB.id}/integration-${randomUUID()}.txt`;
    const content = new TextEncoder().encode("private attachment");
    let uploaded = false;
    let testError: unknown;

    try {
      const { data: upload, error: uploadError } = await userA.client.storage
        .from("attachments")
        .upload(ownerPath, content, { contentType: "text/plain" });

      expect(uploadError).toBeNull();
      expect(upload?.path).toBe(ownerPath);
      uploaded = true;

      const { data: signedUrl, error: signedUrlError } = await userA.client.storage
        .from("attachments")
        .createSignedUrl(ownerPath, 300);

      expect(signedUrlError).toBeNull();
      expect(signedUrl?.signedUrl).toContain("/storage/v1/object/sign/attachments/");

      if (!signedUrl) {
        throw new Error("Expected the owner to create an attachment signed URL");
      }

      const signedDownload = await fetch(signedUrl.signedUrl);

      expect(signedDownload.ok).toBe(true);
      expect(await signedDownload.text()).toBe("private attachment");

      const { data: foreignDownload, error: foreignDownloadError } = await userB.client.storage
        .from("attachments")
        .download(ownerPath);

      expect(foreignDownload).toBeNull();
      expect(foreignDownloadError).not.toBeNull();

      const { data: foreignSignedUrl, error: foreignSignedUrlError } = await userB.client.storage
        .from("attachments")
        .createSignedUrl(ownerPath, 300);

      expect(foreignSignedUrl).toBeNull();
      expect(foreignSignedUrlError).not.toBeNull();

      const { data: foreignUpload, error: foreignUploadError } = await userB.client.storage
        .from("attachments")
        .upload(ownerPath, content, { contentType: "text/plain" });

      expect(foreignUpload).toBeNull();
      expect(foreignUploadError).not.toBeNull();

      const { data: ownForeignPathUpload, error: ownForeignPathUploadError } =
        await userA.client.storage
          .from("attachments")
          .upload(foreignPath, content, { contentType: "text/plain" });

      expect(ownForeignPathUpload).toBeNull();
      expect(ownForeignPathUploadError).not.toBeNull();

      const { data: foreignDelete, error: foreignDeleteError } = await userB.client.storage
        .from("attachments")
        .remove([ownerPath]);

      expect(foreignDeleteError).toBeNull();
      expect(foreignDelete).toEqual([]);

      const { data: ownerDirectDownload, error: ownerDirectDownloadError } =
        await userA.client.storage.from("attachments").download(ownerPath);

      expect(ownerDirectDownload).toBeNull();
      expect(ownerDirectDownloadError).not.toBeNull();
    } catch (error) {
      testError = error;
    }

    const { data: cleanup, error: cleanupError } = await userA.client.storage
      .from("attachments")
      .remove([ownerPath]);

    expect(cleanupError).toBeNull();

    if (uploaded) {
      expect(cleanup).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: ownerPath })]),
      );
    }

    const { data: removedSignedUrl, error: removedSignedUrlError } = await userA.client.storage
      .from("attachments")
      .createSignedUrl(ownerPath, 300);

    expect(removedSignedUrl).toBeNull();
    expect(removedSignedUrlError).not.toBeNull();

    if (testError) {
      throw testError;
    }
  });

  it("cascades attachment metadata when its knowledge object is deleted", async () => {
    const { data: knowledgeObject, error: objectCreateError } = await userA.client
      .from("knowledge_objects")
      .insert({ owner_id: userA.id, title: "Cascade attachment", type: "attachment" })
      .select("id")
      .single();

    expect(objectCreateError).toBeNull();

    if (!knowledgeObject) {
      throw new Error("Expected the owner to create a cascade-test attachment envelope");
    }

    const { error: attachmentCreateError } = await userA.client.from("attachments").insert({
      knowledge_object_id: knowledgeObject.id,
      mime_type: "text/plain",
      owner_id: userA.id,
      size_bytes: 18,
      storage_path: `${userA.id}/${knowledgeObject.id}/cascade.txt`,
    });

    expect(attachmentCreateError).toBeNull();

    const { error: objectDeleteError } = await userA.client
      .from("knowledge_objects")
      .delete()
      .eq("id", knowledgeObject.id);

    expect(objectDeleteError).toBeNull();

    const { data: remainingAttachments, error: attachmentReadError } = await userA.client
      .from("attachments")
      .select("knowledge_object_id")
      .eq("knowledge_object_id", knowledgeObject.id);

    expect(attachmentReadError).toBeNull();
    expect(remainingAttachments).toEqual([]);
  });
});
