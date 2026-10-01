export interface RecencyGroup<T> {
  label: string;
  items: T[];
}

const groupLabels = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"] as const;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const dayMs = 24 * 60 * 60 * 1000;

/**
 * Buckets items by how recently they were edited, in the user's local calendar
 * (UX-05, Apple Notes style). Input order is kept within each bucket, so a
 * newest-first list stays newest-first; empty buckets are dropped.
 */
export function groupByRecency<T>(
  items: readonly T[],
  editedAt: (item: T) => string,
  now: Date = new Date(),
): RecencyGroup<T>[] {
  const today = startOfLocalDay(now);
  const buckets = groupLabels.map((label) => ({ items: [] as T[], label }));

  for (const item of items) {
    const days = Math.round((today - startOfLocalDay(new Date(editedAt(item)))) / dayMs);
    const index = days <= 0 ? 0 : days === 1 ? 1 : days <= 7 ? 2 : days <= 30 ? 3 : 4;
    buckets[index].items.push(item);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}
