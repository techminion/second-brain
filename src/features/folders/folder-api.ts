import type {
  CreateFolderInput,
  Folder,
  FolderDeleteStrategy,
  FolderTreeNode,
} from "@/features/folders/types";
import { requestJson } from "@/shared/lib/api-client";

export function fetchFolderTree(): Promise<FolderTreeNode[]> {
  return requestJson<FolderTreeNode[]>("/api/folders");
}

export function createFolderRequest(input: CreateFolderInput): Promise<Folder> {
  return requestJson<Folder>("/api/folders", { body: JSON.stringify(input), method: "POST" });
}

export function updateFolderRequest(
  id: string,
  input: { name?: string; parentFolderId?: string | null },
): Promise<Folder> {
  return requestJson<Folder>(`/api/folders/${encodeURIComponent(id)}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export function deleteFolderRequest(
  id: string,
  strategy: FolderDeleteStrategy,
): Promise<{ id: string }> {
  const query = new URLSearchParams({ strategy }).toString();
  return requestJson<{ id: string }>(`/api/folders/${encodeURIComponent(id)}?${query}`, {
    method: "DELETE",
  });
}
