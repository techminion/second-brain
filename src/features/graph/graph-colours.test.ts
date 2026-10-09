import { describe, expect, it } from "vitest";

import { assignGraphColours, type FolderLike, paletteSize } from "./graph-colours";
import type { GraphNode } from "./types";

function node(id: string, folderId: string | null = null, tagIds: string[] = []): GraphNode {
  return { folderId, id, tagIds, title: id, type: "note" };
}

const folders: FolderLike[] = [
  { children: [{ children: [], id: "f1a", name: "Sub" }], id: "f1", name: "Work" },
  { children: [], id: "f2", name: "Home" },
];
const tags = [
  { id: "t-z", name: "zeta" },
  { id: "t-a", name: "Alpha" },
  { id: "t-m", name: "mid" },
];

describe("assignGraphColours (UX-11)", () => {
  it("colours nothing in None mode or for an empty graph", () => {
    expect(assignGraphColours([node("a", "f1")], "none", { folders }).legend).toEqual([]);
    expect(assignGraphColours([], "folder", { folders }).legend).toEqual([]);
  });

  it("groups by top-level folder, subfolders inheriting their root; unfiled is neutral", () => {
    const result = assignGraphColours(
      [node("a", "f1"), node("b", "f1a"), node("c", "f2"), node("d"), node("e", "gone")],
      "folder",
      { folders },
    );

    expect(result.byNode.get("a")).toMatchObject({ colour: 1, multi: false });
    expect(result.byNode.get("b")).toMatchObject({ colour: 1, multi: false });
    expect(result.byNode.get("c")).toMatchObject({ colour: 2, multi: false });
    expect(result.byNode.get("d")?.colour).toBeNull();
    expect(result.byNode.get("e")?.colour).toBeNull();
    expect(result.legend).toEqual([
      { colour: 1, count: 2, id: "f1", kind: "group", name: "Work" },
      { colour: 2, count: 1, id: "f2", kind: "group", name: "Home" },
      { colour: null, count: 2, id: null, kind: "none", name: "No folder" },
    ]);
  });

  it("uses the alphabetically first tag, flags multi-tag nodes, and leaves untagged neutral", () => {
    const result = assignGraphColours(
      [node("a", null, ["t-z", "t-a"]), node("b", null, ["t-m"]), node("c")],
      "tag",
      { tags },
    );

    expect(result.byNode.get("a")).toMatchObject({ colour: 1, multi: true });
    expect(result.byNode.get("b")).toMatchObject({ colour: 2, multi: false });
    expect(result.byNode.get("c")).toMatchObject({ colour: null, multi: false });
    expect(result.legend.map((entry) => entry.name)).toEqual(["Alpha", "mid", "Untagged"]);
  });

  it("ranks by count then name, independent of input order", () => {
    const nodes = [node("a", "f2"), node("b", "f1"), node("c", "f2")];
    const one = assignGraphColours(nodes, "folder", { folders });
    const two = assignGraphColours([...nodes].reverse(), "folder", { folders });

    expect(one.legend).toEqual(two.legend);
    expect(one.legend[0]).toMatchObject({ colour: 1, name: "Home" });
    // Equal counts fall back to the name.
    const tie = assignGraphColours([node("x", "f2"), node("y", "f1")], "folder", { folders });
    expect(tie.legend.map((entry) => entry.name)).toEqual(["Home", "Work"]);
  });

  it("collapses groups past the palette into Other", () => {
    const many = Array.from({ length: paletteSize + 3 }, (_, i) => ({
      children: [],
      id: `f${i}`,
      name: `Folder ${String(i).padStart(2, "0")}`,
    }));
    const nodes = many.map((folder) => node(`n-${folder.id}`, folder.id));
    const result = assignGraphColours(nodes, "folder", { folders: many });

    expect(result.legend.filter((entry) => entry.kind === "group")).toHaveLength(paletteSize);
    expect(result.legend.at(-1)).toEqual({
      colour: null,
      count: 3,
      id: null,
      kind: "other",
      name: "Other",
    });
    expect(result.byNode.get("n-f10")?.colour).toBeNull();
  });

  it("describes each node's group in words, for accessible names", () => {
    const byFolder = assignGraphColours([node("a", "f1a"), node("b")], "folder", { folders });
    expect(byFolder.byNode.get("a")?.groupLabel).toBe("folder Work");
    expect(byFolder.byNode.get("b")?.groupLabel).toBe("no folder");

    const byTag = assignGraphColours([node("a", null, ["t-z", "t-a"]), node("c")], "tag", { tags });
    expect(byTag.byNode.get("a")?.groupLabel).toBe("tag Alpha, multiple tags");
    expect(byTag.byNode.get("c")?.groupLabel).toBe("untagged");
  });
});
