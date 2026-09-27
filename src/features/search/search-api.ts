import { requestJson } from "@/shared/lib/api-client";
import type { KnowledgeObjectSummary, Paginated, PaginationOptions, Tag } from "@/shared/types";

export function fetchTags(): Promise<Tag[]> {
  return requestJson<Tag[]>("/api/tags");
}

export function fetchObjectsByTag(
  tagId: string,
  options: PaginationOptions = {},
): Promise<Paginated<KnowledgeObjectSummary>> {
  const params = new URLSearchParams();
  if (options.cursor) {
    params.set("cursor", options.cursor);
  }
  const query = params.toString();
  return requestJson<Paginated<KnowledgeObjectSummary>>(
    `/api/tags/${encodeURIComponent(tagId)}/objects${query ? `?${query}` : ""}`,
  );
}
