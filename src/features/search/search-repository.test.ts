import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SearchRepository } from "@/features/search/search-repository";

function setup(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {};
  for (const method of ["eq", "is", "limit", "or", "order", "select"]) {
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
});
