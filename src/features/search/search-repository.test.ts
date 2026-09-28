import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SearchRepository } from "@/features/search/search-repository";

function setup(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {};
  for (const method of ["eq", "in", "is", "limit", "or", "order", "select"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  const from = vi.fn(() => builder);
  return { builder, from, repository: new SearchRepository({ from } as unknown as SupabaseClient) };
}

describe("SearchRepository", () => {
  it("lists owned tags by name", async () => {
    const { builder, from, repository } = setup({ data: [{ id: "t1", name: "a" }], error: null });

    await expect(repository.listTags("user-id")).resolves.toEqual([{ id: "t1", name: "a" }]);
    expect(from).toHaveBeenCalledWith("tags");
    expect(builder.eq).toHaveBeenCalledWith("owner_id", "user-id");
  });

  it("lists active tagged objects with all their tags, keyset-paged", async () => {
    const { builder, repository } = setup({
      data: [
        {
          created_at: "c",
          id: "n1",
          knowledge_object_tags: [
            { tags: { id: "t2", name: "b" } },
            { tags: { id: "t1", name: "a" } },
          ],
          title: "Plan",
          type: "note",
          updated_at: "u",
        },
      ],
      error: null,
    });

    const items = await repository.listObjectsByTag("user-id", "t1", {
      keysetBefore: { idBefore: "i", updatedAtBefore: "2026-09-01T00:00:00Z" },
      limit: 11,
    });

    expect(items[0].tags.map((tag) => tag.name)).toEqual(["a", "b"]);
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
    expect(builder.eq).toHaveBeenCalledWith("tag_filter.tag_id", "t1");
    expect(builder.or).toHaveBeenCalledWith(
      'updated_at.lt."2026-09-01T00:00:00Z",and(updated_at.eq."2026-09-01T00:00:00Z",id.lt."i")',
    );
    expect(builder.limit).toHaveBeenCalledWith(11);
  });

  it("searches through search_notes and maps the page (FTS-01)", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          created_at: "c",
          id: "n1",
          score: 0.2,
          snippet: "the \u0002roadmap\u0003",
          title: "Plan",
          updated_at: "u",
        },
      ],
      error: null,
    });
    const repository = new SearchRepository({ rpc } as unknown as SupabaseClient);

    await expect(
      repository.searchNotes("user-id", "roadmap", { limit: 11, offset: 20 }),
    ).resolves.toEqual([
      {
        createdAt: "c",
        id: "n1",
        score: 0.2,
        snippet: "the \u0002roadmap\u0003",
        title: "Plan",
        updatedAt: "u",
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("search_notes", {
      p_limit: 11,
      p_offset: 20,
      p_owner_id: "user-id",
      p_query: "roadmap",
    });
  });

  it("surfaces search failures without leaking the database error", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "secret detail" } });
    const repository = new SearchRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.searchNotes("user-id", "x", { limit: 1, offset: 0 })).rejects.toThrow(
      "Unable to search notes",
    );
  });

  it("groups tags per object, sorted by name, with no query for an empty page", async () => {
    const { builder, from, repository } = setup({
      data: [
        { knowledge_object_id: "n1", tags: { id: "t2", name: "b" } },
        { knowledge_object_id: "n1", tags: { id: "t1", name: "a" } },
        { knowledge_object_id: "n2", tags: { id: "t1", name: "a" } },
      ],
      error: null,
    });

    const tags = await repository.getTagsForObjects("user-id", ["n1", "n2"]);
    expect(tags.get("n1")).toEqual([
      { id: "t1", name: "a" },
      { id: "t2", name: "b" },
    ]);
    expect(tags.get("n2")).toEqual([{ id: "t1", name: "a" }]);
    expect(from).toHaveBeenCalledWith("knowledge_object_tags");
    expect(builder.in).toHaveBeenCalledWith("knowledge_object_id", ["n1", "n2"]);

    from.mockClear();
    await expect(repository.getTagsForObjects("user-id", [])).resolves.toEqual(new Map());
    expect(from).not.toHaveBeenCalled();
  });
});
