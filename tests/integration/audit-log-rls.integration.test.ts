import { describe, expect, it } from "vitest";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("audit log schema and RLS", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();

  it("records owner-visible audit metadata and enforces actor values", async () => {
    const metadata = { fields: ["title", "body"] };
    const auditEntry = {
      action: "update",
      actor: "user",
      knowledge_object_id: null,
      metadata,
      owner_id: userA.id,
    };
    const { data: createdEntry, error: createError } = await userA.client
      .from("audit_log")
      .insert(auditEntry)
      .select("id, action, actor, knowledge_object_id, metadata, owner_id, created_at")
      .single();

    expect(createError).toBeNull();
    expect(createdEntry).toMatchObject(auditEntry);

    const { error: invalidActorError } = await userA.client.from("audit_log").insert({
      action: "invalid_actor_test",
      actor: "assistant",
      knowledge_object_id: null,
      metadata: null,
      owner_id: userA.id,
    });

    expect(invalidActorError).toMatchObject({ code: "23514" });
  });

  it("is append-only and denies every cross-user operation", async () => {
    const auditEntry = {
      action: "create",
      actor: "system",
      knowledge_object_id: null,
      metadata: null,
      owner_id: userA.id,
    };
    const { data: createdEntry, error: createError } = await userA.client
      .from("audit_log")
      .insert(auditEntry)
      .select("id")
      .single();

    expect(createError).toBeNull();

    if (!createdEntry) {
      throw new Error("Expected the owner to create an audit entry");
    }

    const { error: ownerUpdateError } = await userA.client
      .from("audit_log")
      .update({ action: "tampered" })
      .eq("id", createdEntry.id);
    const { error: ownerDeleteError } = await userA.client
      .from("audit_log")
      .delete()
      .eq("id", createdEntry.id);

    expect(ownerUpdateError).toMatchObject({ code: "42501" });
    expect(ownerDeleteError).toMatchObject({ code: "42501" });

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("audit_log")
      .select("id")
      .eq("id", createdEntry.id);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { error: foreignInsertError } = await userB.client.from("audit_log").insert(auditEntry);
    const { error: foreignUpdateError } = await userB.client
      .from("audit_log")
      .update({ action: "foreign_tamper" })
      .eq("id", createdEntry.id);
    const { error: foreignDeleteError } = await userB.client
      .from("audit_log")
      .delete()
      .eq("id", createdEntry.id);

    expect(foreignInsertError).toMatchObject({ code: "42501" });
    expect(foreignUpdateError).toMatchObject({ code: "42501" });
    expect(foreignDeleteError).toMatchObject({ code: "42501" });
  });

  it("retains audit history when its knowledge object is purged", async () => {
    const { data: knowledgeObject, error: objectCreateError } = await userA.client
      .from("knowledge_objects")
      .insert({ owner_id: userA.id, title: "Audited object", type: "note" })
      .select("id")
      .single();

    expect(objectCreateError).toBeNull();

    if (!knowledgeObject) {
      throw new Error("Expected the owner to create an audited object");
    }

    const { data: auditEntry, error: auditCreateError } = await userA.client
      .from("audit_log")
      .insert({
        action: "create",
        actor: "user",
        knowledge_object_id: knowledgeObject.id,
        metadata: null,
        owner_id: userA.id,
      })
      .select("id")
      .single();

    expect(auditCreateError).toBeNull();

    if (!auditEntry) {
      throw new Error("Expected the owner to create an object audit entry");
    }

    const { error: objectDeleteError } = await userA.client
      .from("knowledge_objects")
      .delete()
      .eq("id", knowledgeObject.id);

    expect(objectDeleteError).toBeNull();

    const { data: retainedEntry, error: retainedEntryError } = await userA.client
      .from("audit_log")
      .select("id, knowledge_object_id")
      .eq("id", auditEntry.id)
      .single();

    expect(retainedEntryError).toBeNull();
    expect(retainedEntry).toEqual({
      id: auditEntry.id,
      knowledge_object_id: null,
    });
  });
});
