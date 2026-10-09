import type { GraphNode } from "./types";

/** What graph nodes are coloured by (UX-11, ADR-42). */
export type ColourBy = "none" | "folder" | "tag";

export const colourByOptions: { value: ColourBy; label: string }[] = [
  { label: "None", value: "none" },
  { label: "Folder", value: "folder" },
  { label: "Tag", value: "tag" },
];

/** Categorical palette size: `--graph-1..8`. Further groups share "Other". */
export const paletteSize = 8;

export interface FolderLike {
  id: string;
  name: string;
  children: FolderLike[];
}

export interface TagLike {
  id: string;
  name: string;
}

export interface NodeColour {
  /** 1..8 → `--color-graph-N`; null → the neutral default dot. */
  colour: number | null;
  /** Tag mode: the note has more than one tag (drawn as a ring, not colour). */
  multi: boolean;
}

export interface LegendEntry {
  /** "group" entries can apply a filter; "other" and "none" can't. */
  kind: "group" | "other" | "none";
  /** The folder or tag id for a group; null otherwise. */
  id: string | null;
  name: string;
  count: number;
  colour: number | null;
}

export interface GraphColouring {
  byNode: Map<string, NodeColour>;
  legend: LegendEntry[];
}

const empty: GraphColouring = { byNode: new Map(), legend: [] };

function rootFolders(folders: FolderLike[]): Map<string, FolderLike> {
  const roots = new Map<string, FolderLike>();
  const walk = (folder: FolderLike, root: FolderLike) => {
    roots.set(folder.id, root);
    folder.children.forEach((child) => walk(child, root));
  };
  folders.forEach((folder) => walk(folder, folder));
  return roots;
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

/**
 * Colour assignment for the graph (UX-11, ADR-42). Pure and deterministic:
 * - folder: a note takes its top-level folder (subfolders inherit their root,
 *   like the FR-GRAPH-3 folder filter); no folder → neutral "No folder".
 * - tag: a note takes its alphabetically first tag; more than one tag sets
 *   `multi`; untagged → neutral "Untagged".
 * Groups are ranked by node count (desc), then name, then id, so colours are
 * stable for the same data. The first 8 get `--graph-1..8`; the rest share
 * the neutral "Other".
 */
export function assignGraphColours(
  nodes: readonly GraphNode[],
  mode: ColourBy,
  sources: { folders?: FolderLike[]; tags?: TagLike[] },
): GraphColouring {
  if (mode === "none" || nodes.length === 0) {
    return empty;
  }

  const groupOf = new Map<string, string | null>();
  const multi = new Set<string>();
  const names = new Map<string, string>();

  if (mode === "folder") {
    const roots = rootFolders(sources.folders ?? []);
    for (const node of nodes) {
      const root = node.folderId ? roots.get(node.folderId) : undefined;
      if (root) {
        names.set(root.id, root.name);
      }
      groupOf.set(node.id, root?.id ?? null);
    }
  } else {
    const tagNames = new Map((sources.tags ?? []).map((tag) => [tag.id, tag.name]));
    for (const node of nodes) {
      const known = node.tagIds
        .filter((id) => tagNames.has(id))
        .sort((a, b) => byName(tagNames.get(a)!, tagNames.get(b)!) || a.localeCompare(b));
      if (known.length > 1) {
        multi.add(node.id);
      }
      const first = known[0] ?? null;
      if (first) {
        names.set(first, tagNames.get(first)!);
      }
      groupOf.set(node.id, first);
    }
  }

  const counts = new Map<string, number>();
  let neutral = 0;
  for (const group of groupOf.values()) {
    if (group === null) {
      neutral += 1;
    } else {
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()].sort(
    ([aId, a], [bId, b]) =>
      b - a || byName(names.get(aId)!, names.get(bId)!) || aId.localeCompare(bId),
  );
  const colourOf = new Map(
    ranked.slice(0, paletteSize).map(([id], index) => [id, index + 1] as const),
  );

  const byNode = new Map<string, NodeColour>();
  for (const node of nodes) {
    const group = groupOf.get(node.id) ?? null;
    byNode.set(node.id, {
      colour: group ? (colourOf.get(group) ?? null) : null,
      multi: multi.has(node.id),
    });
  }

  const legend: LegendEntry[] = ranked.slice(0, paletteSize).map(([id, count]) => ({
    colour: colourOf.get(id)!,
    count,
    id,
    kind: "group",
    name: names.get(id)!,
  }));
  const otherCount = ranked.slice(paletteSize).reduce((sum, [, count]) => sum + count, 0);
  if (otherCount > 0) {
    legend.push({ colour: null, count: otherCount, id: null, kind: "other", name: "Other" });
  }
  if (neutral > 0) {
    legend.push({
      colour: null,
      count: neutral,
      id: null,
      kind: "none",
      name: mode === "folder" ? "No folder" : "Untagged",
    });
  }

  return { byNode, legend };
}
