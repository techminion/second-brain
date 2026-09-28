import type { Graph, GraphFilter } from "@/features/graph/types";
import { requestJson } from "@/shared/lib/api-client";

export function fetchGraph(filter: GraphFilter = {}): Promise<Graph> {
  const params = new URLSearchParams();
  if (filter.tagId) {
    params.set("tagId", filter.tagId);
  }
  if (filter.folderId) {
    params.set("folderId", filter.folderId);
  }
  const query = params.toString();
  return requestJson<Graph>(`/api/graph${query ? `?${query}` : ""}`);
}

export function fetchLocalGraph(noteId: string, depth = 1): Promise<Graph> {
  return requestJson<Graph>(`/api/notes/${encodeURIComponent(noteId)}/graph?depth=${depth}`);
}
