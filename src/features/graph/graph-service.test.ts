import { describe, expect, it, vi } from "vitest";

import { GraphService } from "@/features/graph/graph-service";
import type { GraphEdge, GraphNodeRecord } from "@/features/graph/types";
import { NotFoundError } from "@/shared/lib/errors";

function node(id: string, folderId: string | null = null, tagIds: string[] = []): GraphNodeRecord {
  return { folderId, id, tagIds, title: id.toUpperCase(), type: "note" };
}

// a → b → c → d ; e isolated ; x is a trashed note (absent from nodes)
const nodes = [
  node("a", "f1", ["t1"]),
  node("b", "f2", ["t1"]),
  node("c"),
  node("d"),
  node("e", "f1"),
];
const edges: GraphEdge[] = [
  { sourceId: "a", targetId: "b" },
  { sourceId: "b", targetId: "c" },
  { sourceId: "c", targetId: "d" },
  { sourceId: "a", targetId: "x" },
];

function setup() {
  const repository = {
    listEdges: vi.fn().mockResolvedValue(edges),
    listNodes: vi.fn().mockResolvedValue(nodes),
  };
  const folders = {
    getTree: vi.fn().mockResolvedValue([
      {
        children: [
          {
            children: [],
            createdAt: "",
            id: "f2",
            name: "Sub",
            parentFolderId: "f1",
            updatedAt: "",
          },
        ],
        createdAt: "",
        id: "f1",
        name: "Top",
        parentFolderId: null,
        updatedAt: "",
      },
    ]),
  };
  return { folders, service: new GraphService(repository, folders) };
}

const ids = (items: { id: string }[]) => items.map((item) => item.id).sort();

describe("GraphService.getGraph (GRAPH-01)", () => {
  it("returns every active note and only edges between active notes", async () => {
    const { service } = setup();

    const graph = await service.getGraph("user-id");

    expect(ids(graph.nodes)).toEqual(["a", "b", "c", "d", "e"]);
    expect(graph.edges).toHaveLength(3);
    expect(graph.edges).not.toContainEqual({ sourceId: "a", targetId: "x" });
  });

  it("filters by tag and by folder subtree, combining with AND", async () => {
    const { folders, service } = setup();

    expect(ids((await service.getGraph("user-id", { tagId: "t1" })).nodes)).toEqual(["a", "b"]);

    const byFolder = await service.getGraph("user-id", { folderId: "f1" });
    expect(ids(byFolder.nodes)).toEqual(["a", "b", "e"]);
    expect(byFolder.edges).toEqual([{ sourceId: "a", targetId: "b" }]);
    expect(folders.getTree).toHaveBeenCalledWith("user-id");

    const both = await service.getGraph("user-id", { folderId: "f2", tagId: "t1" });
    expect(ids(both.nodes)).toEqual(["b"]);
  });
});

describe("GraphService.getLocalGraph (GRAPH-02)", () => {
  it("returns direct neighbors in both directions at depth 1", async () => {
    const { service } = setup();

    const graph = await service.getLocalGraph("user-id", "b");

    expect(ids(graph.nodes)).toEqual(["a", "b", "c"]);
    expect(graph.edges).toHaveLength(2);
  });

  it("expands by depth and clamps it to 3", async () => {
    const { service } = setup();

    expect(ids((await service.getLocalGraph("user-id", "a", 2)).nodes)).toEqual(["a", "b", "c"]);
    expect(ids((await service.getLocalGraph("user-id", "a", 99)).nodes)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("404s a missing or trashed note", async () => {
    const { service } = setup();

    await expect(service.getLocalGraph("user-id", "x")).rejects.toBeInstanceOf(NotFoundError);
  });
});
