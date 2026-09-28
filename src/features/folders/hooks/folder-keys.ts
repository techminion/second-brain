import { foldersRootKey } from "@/shared/lib/query-keys";

/** TanStack Query keys for folders; `tree()` is the whole sidebar hierarchy. */
export const folderKeys = {
  all: foldersRootKey,
  tree: () => [...folderKeys.all, "tree"] as const,
};
