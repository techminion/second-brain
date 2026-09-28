import { describe, expect, it } from "vitest";

import type { FolderTreeNode } from "@/features/folders/types";

import { ancestorIds, findFolder, flattenVisible, folderOptions } from "./folder-tree-model";

function node(id: string, children: FolderTreeNode[] = []): FolderTreeNode {
  return {
    children,
    createdAt: "",
    id,
    name: id.toUpperCase(),
    parentFolderId: null,
    updatedAt: "",
  };
}

const tree = [node("a", [node("b", [node("c")])]), node("d")];

describe("folder tree model", () => {
  it("flattens only expanded branches, with depth and parent", () => {
    expect(flattenVisible(tree, new Set()).map((row) => row.node.id)).toEqual(["a", "d"]);

    const rows = flattenVisible(tree, new Set(["a", "b"]));
    expect(rows.map((row) => [row.node.id, row.depth, row.parentId])).toEqual([
      ["a", 1, null],
      ["b", 2, "a"],
      ["c", 3, "b"],
      ["d", 1, null],
    ]);
  });

  it("labels options with their full path", () => {
    expect(folderOptions(tree).map((option) => option.label)).toEqual([
      "A",
      "A / B",
      "A / B / C",
      "D",
    ]);
  });

  it("finds nodes and their ancestors", () => {
    expect(findFolder(tree, "c")?.name).toBe("C");
    expect(findFolder(tree, "zz")).toBeUndefined();
    expect(ancestorIds(tree, "c")).toEqual(["a", "b"]);
    expect(ancestorIds(tree, "a")).toEqual([]);
  });
});
