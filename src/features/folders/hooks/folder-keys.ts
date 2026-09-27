/** TanStack Query keys for folders; `tree()` is the whole sidebar hierarchy. */
export const folderKeys = {
  all: ["folders"] as const,
  tree: () => [...folderKeys.all, "tree"] as const,
};

// Folder deletes and moves change which notes are listed where, so they also
// invalidate the notes feature's caches — addressed by its root key rather
// than importing another feature's hooks (feature-boundary rule).
export const notesRootKey = ["notes"] as const;
