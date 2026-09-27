import { describe, expect, it, vi } from "vitest";

import { SearchService } from "@/features/search/search-service";
import { NotFoundError } from "@/shared/lib/errors";
import type { KnowledgeObjectSummary } from "@/shared/types";

const tagId = "22222222-2222-4222-8222-222222222222";

function summary(id: string, updatedAt: string): KnowledgeObjectSummary {
  return { createdAt: updatedAt, id, tags: [], title: id, type: "note", updatedAt };
}

function setup() {
  const repository = {
    getTag: vi.fn().mockResolvedValue({ id: tagId, name: "Research" }),
    listObjectsByTag: vi.fn().mockResolvedValue([]),
    listTags: vi.fn().mockResolvedValue([{ id: tagId, name: "Research" }]),
  };
  return { repository, service: new SearchService(repository) };
}

describe("SearchService tag browsing (TAG-02)", () => {
  it("lists the caller's tags", async () => {
    const { repository, service } = setup();

    await expect(service.listTags("user-id")).resolves.toEqual([{ id: tagId, name: "Research" }]);
    expect(repository.listTags).toHaveBeenCalledWith("user-id");
  });

  it("pages tagged objects with a keyset cursor", async () => {
    const { repository, service } = setup();
    const a = summary("11111111-1111-4111-8111-111111111111", "2026-09-02T00:00:00.000Z");
    const b = summary("33333333-3333-4333-8333-333333333333", "2026-09-01T00:00:00.000Z");
    repository.listObjectsByTag.mockResolvedValueOnce([a, b]);

    const page = await service.listByTag("user-id", tagId, { limit: 1 });
    expect(page.items).toEqual([a]);
    expect(page.nextCursor).toEqual(expect.any(String));

    repository.listObjectsByTag.mockResolvedValueOnce([b]);
    await service.listByTag("user-id", tagId, { cursor: page.nextCursor, limit: 1 });
    expect(repository.listObjectsByTag).toHaveBeenLastCalledWith("user-id", tagId, {
      keysetBefore: { idBefore: a.id, updatedAtBefore: a.updatedAt },
      limit: 2,
    });
  });

  it("404s an unknown, foreign, or malformed tag id", async () => {
    const { repository, service } = setup();
    repository.getTag.mockResolvedValue(null);

    await expect(service.listByTag("user-id", tagId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.listByTag("user-id", "nope")).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.listObjectsByTag).not.toHaveBeenCalled();
  });
});
