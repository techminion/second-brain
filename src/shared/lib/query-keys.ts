// Root TanStack Query keys shared across features. A feature invalidates
// another feature's caches through these roots instead of importing its hooks
// (feature-boundary rule). Each feature's own key factory hangs off its root.
export const notesRootKey = ["notes"] as const;
export const foldersRootKey = ["folders"] as const;
export const tagsRootKey = ["tags"] as const;
export const graphRootKey = ["graph"] as const;
