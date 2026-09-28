import { describe, expect, it, vi } from "vitest";

import { SearchService } from "@/features/search/search-service";
import { NotFoundError, ValidationError } from "@/shared/lib/errors";
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
    getTagsForObjects: vi.fn().mockResolvedValue(new Map()),
    searchNotes: vi.fn().mockResolvedValue([]),
    suggestNoteTitles: vi.fn().mockResolvedValue([]),
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

describe("SearchService.suggestNoteTitles (SRCH-06)", () => {
  it("trims the query and clamps the limit", async () => {
    const { repository, service } = setup();

    await service.suggestNoteTitles("user-id", "  plan ", 500);

    expect(repository.suggestNoteTitles).toHaveBeenCalledWith("user-id", "plan", 50);
  });

  it("returns nothing for a blank query without touching data", async () => {
    const { repository, service } = setup();

    await expect(service.suggestNoteTitles("user-id", "   ")).resolves.toEqual([]);
    expect(repository.suggestNoteTitles).not.toHaveBeenCalled();
  });
});

function hit(n: number, score = 1 / n) {
  return {
    createdAt: "2026-09-01T00:00:00.000Z",
    id: `0000000${n}-0000-4000-8000-000000000000`.slice(-36),
    score,
    snippet: `about \u0002roadmap\u0003 ${n}`,
    title: `Note ${n}`,
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

// FTS-03 / FTS-10: SearchService.search (full-text branch).
describe("SearchService.search (FTS-03, FTS-10)", () => {
  it.each(["", "   ", undefined, 42])(
    "rejects an empty query %j with ValidationError",
    async (query) => {
      const { repository, service } = setup();

      await expect(service.search("user-id", query as string)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(repository.searchNotes).not.toHaveBeenCalled();
    },
  );

  it("passes the trimmed web-search query through and maps hits to full-text results", async () => {
    const { repository, service } = setup();
    repository.searchNotes.mockResolvedValueOnce([hit(1)]);
    repository.getTagsForObjects.mockResolvedValueOnce(
      new Map([[hit(1).id, [{ id: tagId, name: "Research" }]]]),
    );

    const page = await service.search("user-id", '  "product roadmap" -draft  ');

    expect(repository.searchNotes).toHaveBeenCalledWith("user-id", '"product roadmap" -draft', {
      limit: 51,
      offset: 0,
    });
    expect(page).toEqual({
      items: [
        {
          matchType: "fulltext",
          object: {
            createdAt: hit(1).createdAt,
            id: hit(1).id,
            tags: [{ id: tagId, name: "Research" }],
            title: "Note 1",
            type: "note",
            updatedAt: hit(1).updatedAt,
          },
          score: 1,
          snippet: "about \u0002roadmap\u0003 1",
        },
      ],
    });
    expect(repository.getTagsForObjects).toHaveBeenCalledWith("user-id", [hit(1).id]);
  });

  it("pages with an opaque cursor that resumes exactly where the last page ended", async () => {
    const { repository, service } = setup();
    repository.searchNotes
      .mockResolvedValueOnce([hit(1), hit(2), hit(3)])
      .mockResolvedValueOnce([hit(3), hit(4)]);

    const first = await service.search("user-id", "roadmap", { limit: 2 });
    expect(first.items.map((item) => item.object.title)).toEqual(["Note 1", "Note 2"]);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await service.search("user-id", "roadmap", {
      cursor: first.nextCursor,
      limit: 2,
    });
    expect(repository.searchNotes).toHaveBeenLastCalledWith("user-id", "roadmap", {
      limit: 3,
      offset: 2,
    });
    expect(second.items.map((item) => item.object.title)).toEqual(["Note 3", "Note 4"]);
    expect(second.nextCursor).toBeUndefined();
  });

  it.each(["not-base64!", "eyJvIjotNX0", "eyJvIjoiMTAifQ", "x".repeat(200)])(
    "treats a forged cursor %j as the first page",
    async (cursor) => {
      const { repository, service } = setup();

      await service.search("user-id", "roadmap", { cursor });

      expect(repository.searchNotes).toHaveBeenCalledWith("user-id", "roadmap", {
        limit: 51,
        offset: 0,
      });
    },
  );

  it("clamps the limit and truncates an oversized query", async () => {
    const { repository, service } = setup();

    await service.search("user-id", "a".repeat(2000), { limit: 5000 });

    const [, query, options] = repository.searchNotes.mock.lastCall as [
      string,
      string,
      { limit: number },
    ];
    expect(query).toHaveLength(500);
    expect(options.limit).toBe(101);
  });

  it("returns an empty page when nothing matches (e.g. only stop words)", async () => {
    const { repository, service } = setup();

    await expect(service.search("user-id", "the and of")).resolves.toEqual({ items: [] });
    expect(repository.getTagsForObjects).toHaveBeenCalledWith("user-id", []);
  });
});
