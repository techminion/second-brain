/**
 * Compact "last edited" label for the note list (FR-NOTE-6): relative for the
 * last week ("just now", "5m ago", "3h ago", "2d ago"), then a short date.
 * `now` is injectable for deterministic tests.
 */
export function formatLastEdited(iso: string, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(
    new Date(iso),
  );
}
