import { describe, expect, it } from "vitest";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("chat schema and RLS", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();

  it("enforces chat constraints and owner-only access", async () => {
    const { data: knowledgeObject, error: objectCreateError } = await userA.client
      .from("knowledge_objects")
      .insert({ owner_id: userA.id, title: "Chat source", type: "note" })
      .select("id")
      .single();

    expect(objectCreateError).toBeNull();

    if (!knowledgeObject) {
      throw new Error("Expected the owner to create a chat source object");
    }

    const conversation = {
      note_id: knowledgeObject.id,
      owner_id: userA.id,
      scope: "note",
    };
    const { data: createdConversation, error: conversationCreateError } = await userA.client
      .from("chat_conversations")
      .insert(conversation)
      .select("id, note_id, owner_id, scope")
      .single();

    expect(conversationCreateError).toBeNull();
    expect(createdConversation).toMatchObject(conversation);

    if (!createdConversation) {
      throw new Error("Expected the owner to create a chat conversation");
    }

    const citations = [{ knowledge_object_id: knowledgeObject.id }];
    const message = {
      citations,
      content: "Summarize this note",
      conversation_id: createdConversation.id,
      owner_id: userA.id,
      role: "user",
    };
    const { data: createdMessage, error: messageCreateError } = await userA.client
      .from("chat_messages")
      .insert(message)
      .select("id, citations, content, conversation_id, owner_id, role")
      .single();

    expect(messageCreateError).toBeNull();
    expect(createdMessage).toMatchObject(message);

    if (!createdMessage) {
      throw new Error("Expected the owner to create a chat message");
    }

    const { error: invalidScopeError } = await userA.client.from("chat_conversations").insert({
      note_id: null,
      owner_id: userA.id,
      scope: "invalid",
    });

    expect(invalidScopeError).toMatchObject({ code: "23514" });

    const { error: invalidRoleError } = await userA.client.from("chat_messages").insert({
      citations: null,
      content: "Invalid role",
      conversation_id: createdConversation.id,
      owner_id: userA.id,
      role: "system",
    });

    expect(invalidRoleError).toMatchObject({ code: "23514" });

    const { data: foreignConversationRead, error: foreignConversationReadError } =
      await userB.client.from("chat_conversations").select("id").eq("id", createdConversation.id);

    expect(foreignConversationReadError).toBeNull();
    expect(foreignConversationRead).toEqual([]);

    const { data: foreignConversationUpdate, error: foreignConversationUpdateError } =
      await userB.client
        .from("chat_conversations")
        .update({ scope: "vault" })
        .eq("id", createdConversation.id)
        .select("id");

    expect(foreignConversationUpdateError).toBeNull();
    expect(foreignConversationUpdate).toEqual([]);

    const { data: foreignConversationDelete, error: foreignConversationDeleteError } =
      await userB.client
        .from("chat_conversations")
        .delete()
        .eq("id", createdConversation.id)
        .select("id");

    expect(foreignConversationDeleteError).toBeNull();
    expect(foreignConversationDelete).toEqual([]);

    const { error: foreignConversationInsertError } = await userB.client
      .from("chat_conversations")
      .insert(conversation);

    expect(foreignConversationInsertError).toMatchObject({ code: "42501" });

    const { data: foreignMessageRead, error: foreignMessageReadError } = await userB.client
      .from("chat_messages")
      .select("id")
      .eq("id", createdMessage.id);

    expect(foreignMessageReadError).toBeNull();
    expect(foreignMessageRead).toEqual([]);

    const { data: foreignMessageUpdate, error: foreignMessageUpdateError } = await userB.client
      .from("chat_messages")
      .update({ content: "Forbidden update" })
      .eq("id", createdMessage.id)
      .select("id");

    expect(foreignMessageUpdateError).toBeNull();
    expect(foreignMessageUpdate).toEqual([]);

    const { data: foreignMessageDelete, error: foreignMessageDeleteError } = await userB.client
      .from("chat_messages")
      .delete()
      .eq("id", createdMessage.id)
      .select("id");

    expect(foreignMessageDeleteError).toBeNull();
    expect(foreignMessageDelete).toEqual([]);

    const { error: foreignMessageInsertError } = await userB.client
      .from("chat_messages")
      .insert(message);

    expect(foreignMessageInsertError).toMatchObject({ code: "42501" });
  });

  it("cascades messages when their conversation is deleted", async () => {
    const { data: conversation, error: conversationCreateError } = await userA.client
      .from("chat_conversations")
      .insert({ note_id: null, owner_id: userA.id, scope: "vault" })
      .select("id")
      .single();

    expect(conversationCreateError).toBeNull();

    if (!conversation) {
      throw new Error("Expected the owner to create a cascade-test conversation");
    }

    const { data: message, error: messageCreateError } = await userA.client
      .from("chat_messages")
      .insert({
        citations: null,
        content: "Cascade with conversation",
        conversation_id: conversation.id,
        owner_id: userA.id,
        role: "assistant",
      })
      .select("id")
      .single();

    expect(messageCreateError).toBeNull();

    if (!message) {
      throw new Error("Expected the owner to create a cascade-test message");
    }

    const { error: conversationDeleteError } = await userA.client
      .from("chat_conversations")
      .delete()
      .eq("id", conversation.id);

    expect(conversationDeleteError).toBeNull();

    const { data: remainingMessages, error: messageReadError } = await userA.client
      .from("chat_messages")
      .select("id")
      .eq("id", message.id);

    expect(messageReadError).toBeNull();
    expect(remainingMessages).toEqual([]);
  });

  it("cascades note conversations and messages when their object is deleted", async () => {
    const { data: knowledgeObject, error: objectCreateError } = await userA.client
      .from("knowledge_objects")
      .insert({ owner_id: userA.id, title: "Cascade chat source", type: "note" })
      .select("id")
      .single();

    expect(objectCreateError).toBeNull();

    if (!knowledgeObject) {
      throw new Error("Expected the owner to create a cascade-test chat source");
    }

    const { data: conversation, error: conversationCreateError } = await userA.client
      .from("chat_conversations")
      .insert({ note_id: knowledgeObject.id, owner_id: userA.id, scope: "note" })
      .select("id")
      .single();

    expect(conversationCreateError).toBeNull();

    if (!conversation) {
      throw new Error("Expected the owner to create a note conversation");
    }

    const { data: message, error: messageCreateError } = await userA.client
      .from("chat_messages")
      .insert({
        citations: null,
        content: "Cascade with note",
        conversation_id: conversation.id,
        owner_id: userA.id,
        role: "assistant",
      })
      .select("id")
      .single();

    expect(messageCreateError).toBeNull();

    if (!message) {
      throw new Error("Expected the owner to create a note conversation message");
    }

    const { error: objectDeleteError } = await userA.client
      .from("knowledge_objects")
      .delete()
      .eq("id", knowledgeObject.id);

    expect(objectDeleteError).toBeNull();

    const { data: remainingConversations, error: conversationReadError } = await userA.client
      .from("chat_conversations")
      .select("id")
      .eq("id", conversation.id);
    const { data: remainingMessages, error: messageReadError } = await userA.client
      .from("chat_messages")
      .select("id")
      .eq("id", message.id);

    expect(conversationReadError).toBeNull();
    expect(remainingConversations).toEqual([]);
    expect(messageReadError).toBeNull();
    expect(remainingMessages).toEqual([]);
  });
});
