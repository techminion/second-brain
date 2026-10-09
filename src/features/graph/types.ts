import type { KnowledgeObjectType } from "@/shared/types";

export interface GraphNode {
  id: string;
  title: string;
  type: KnowledgeObjectType;
  /** The note's folder, or null at the root (UX-11: colour by folder). */
  folderId: string | null;
  /** The note's tag ids (UX-11: colour by tag). */
  tagIds: string[];
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphFilter {
  folderId?: string;
  tagId?: string;
}

export type GraphNodeRecord = GraphNode;
