import { retentionWindowDays } from "@/features/retention/constants";

const dayMs = 24 * 60 * 60 * 1000;

/**
 * "Deletes in N days" label for a trashed note: whole days left before the
 * 30-day retention window closes and the purge worker may remove it
 * (04_DATABASE §6, ADR-18). `now` is injectable for deterministic tests.
 */
export function formatTrashExpiry(deletedAtIso: string, now: Date = new Date()): string {
  const expiresAt = new Date(deletedAtIso).getTime() + retentionWindowDays * dayMs;
  const daysLeft = Math.ceil((expiresAt - now.getTime()) / dayMs);

  if (daysLeft <= 0) {
    return "Deleting soon";
  }

  return daysLeft === 1 ? "Deletes in 1 day" : `Deletes in ${daysLeft} days`;
}
