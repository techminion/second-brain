import type { KnowledgeObjectType } from "@/shared/types";

export interface GraphNode {
  id: string;
  title: string;
  type: KnowledgeObjectType;
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

export interface GraphNodeRecord extends GraphNode {
  folderId: string | null;
  tagIds: string[];
}
