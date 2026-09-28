import type { FolderTreeNode } from "@/features/folders/types";

export interface VisibleFolder {
  node: FolderTreeNode;
  depth: number;
  parentId: string | null;
}

/** Depth-first rows currently visible given the expanded set (tree order). */
export function flattenVisible(
  nodes: FolderTreeNode[],
  expanded: ReadonlySet<string>,
  depth = 1,
  parentId: string | null = null,
): VisibleFolder[] {
  return nodes.flatMap((node) => [
    { depth, node, parentId },
    ...(expanded.has(node.id) ? flattenVisible(node.children, expanded, depth + 1, node.id) : []),
  ]);
}

export interface FolderOption {
  id: string;
  label: string;
}

/** Every folder as a "Parent / Child" path label, in tree order. */
export function folderOptions(nodes: FolderTreeNode[], prefix = ""): FolderOption[] {
  return nodes.flatMap((node) => {
    const label = prefix ? `${prefix} / ${node.name}` : node.name;
    return [{ id: node.id, label }, ...folderOptions(node.children, label)];
  });
}

/** Find a node anywhere in the tree. */
export function findFolder(nodes: FolderTreeNode[], id: string): FolderTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findFolder(node.children, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** Ids of the folder's ancestors, nearest last — used to reveal a folder. */
export function ancestorIds(nodes: FolderTreeNode[], id: string, trail: string[] = []): string[] {
  for (const node of nodes) {
    if (node.id === id) {
      return trail;
    }
    const found = ancestorIds(node.children, id, [...trail, node.id]);
    if (found.length > 0 || node.children.some((child) => child.id === id)) {
      return found;
    }
  }
  return [];
}
