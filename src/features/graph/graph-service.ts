import { createFolderService, type FolderService } from "@/features/folders/folder-service";
import type { FolderTreeNode } from "@/features/folders/types";
import { GraphRepository } from "@/features/graph/graph-repository";
import type { Graph, GraphFilter, GraphNode, GraphNodeRecord } from "@/features/graph/types";
import { NotFoundError } from "@/shared/lib/errors";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

type GraphRepositoryContract = Pick<GraphRepository, "listEdges" | "listNodes">;
type FolderTreeSource = Pick<FolderService, "getTree">;

const maxLocalDepth = 3;

function toNode(record: GraphNodeRecord): GraphNode {
  return {
    folderId: record.folderId,
    id: record.id,
    tagIds: [...record.tagIds],
    title: record.title,
    type: record.type,
  };
}

function subtreeIds(nodes: FolderTreeNode[], rootId: string): Set<string> {
  const collect = (node: FolderTreeNode, into: Set<string>): Set<string> => {
    into.add(node.id);
    node.children.forEach((child) => collect(child, into));
    return into;
  };

  for (const node of nodes) {
    if (node.id === rootId) {
      return collect(node, new Set());
    }
    const found = subtreeIds(node.children, rootId);
    if (found.size > 0) {
      return found;
    }
  }

  return new Set();
}

/**
 * GraphService (05_API §7): notes as nodes, wiki links as edges. Trashed
 * notes and edges touching them never appear (GRAPH-18).
 */
export class GraphService {
  constructor(
    private readonly repository: GraphRepositoryContract,
    private readonly folders: FolderTreeSource,
  ) {}

  /**
   * The owned graph (FR-GRAPH-1), optionally reduced by tag and/or folder
   * (FR-GRAPH-3). A folder filter includes its subfolders; filters combine
   * with AND. Edges are kept only when both endpoints survive the filter.
   */
  async getGraph(userId: string, filter: GraphFilter = {}): Promise<Graph> {
    const [records, edges] = await Promise.all([
      this.repository.listNodes(userId),
      this.repository.listEdges(userId),
    ]);

    let kept = records;

    if (filter.tagId) {
      kept = kept.filter((record) => record.tagIds.includes(filter.tagId as string));
    }

    if (filter.folderId) {
      const folderIds = subtreeIds(await this.folders.getTree(userId), filter.folderId);
      kept = kept.filter((record) => record.folderId !== null && folderIds.has(record.folderId));
    }

    const ids = new Set(kept.map((record) => record.id));

    return {
      edges: edges.filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId)),
      nodes: kept.map(toNode),
    };
  }

  /**
   * A note and its neighbors within `depth` hops, following links in both
   * directions (FR-GRAPH-4). Depth defaults to 1 and is clamped to 1–3.
   */
  async getLocalGraph(userId: string, noteId: string, depth = 1): Promise<Graph> {
    const [records, edges] = await Promise.all([
      this.repository.listNodes(userId),
      this.repository.listEdges(userId),
    ]);
    const byId = new Map(records.map((record) => [record.id, record]));

    if (!byId.has(noteId)) {
      throw new NotFoundError("Note not found");
    }

    const hops = Math.min(
      Math.max(Number.isFinite(depth) ? Math.floor(depth) : 1, 1),
      maxLocalDepth,
    );
    const liveEdges = edges.filter((edge) => byId.has(edge.sourceId) && byId.has(edge.targetId));
    const reached = new Set([noteId]);
    let frontier = [noteId];

    for (let hop = 0; hop < hops && frontier.length > 0; hop += 1) {
      const next: string[] = [];
      for (const edge of liveEdges) {
        for (const [from, to] of [
          [edge.sourceId, edge.targetId],
          [edge.targetId, edge.sourceId],
        ]) {
          if (frontier.includes(from) && !reached.has(to)) {
            reached.add(to);
            next.push(to);
          }
        }
      }
      frontier = next;
    }

    return {
      edges: liveEdges.filter((edge) => reached.has(edge.sourceId) && reached.has(edge.targetId)),
      nodes: [...reached].map((id) => toNode(byId.get(id) as GraphNodeRecord)),
    };
  }
}

export async function createGraphService(): Promise<GraphService> {
  const client = await createServerActionSupabaseClient();
  return new GraphService(new GraphRepository(client), await createFolderService());
}
