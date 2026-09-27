// Opaque keyset-pagination cursors shared by list endpoints (05_API
// `PaginationOptions`). A cursor is base64url `{ i: id, u: timestamp }`; the
// timestamp is whatever column the listing sorts on. Decoding is strict — the
// id must be a UUID and the timestamp ISO-8601 — so a forged cursor can never
// smuggle PostgREST filter syntax into a keyset `or(...)` clause.

const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const defaultListLimit = 50;
export const maxListLimit = 100;

export interface DecodedCursor {
  id: string;
  timestamp: string;
}

// List contracts declare no errors, so limit and cursor are normalized
// defensively instead of thrown on: out-of-range limits clamp, malformed
// cursors restart from the first page.
export function clampListLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return defaultListLimit;
  }

  return Math.min(Math.max(Math.floor(limit), 1), maxListLimit);
}

export function encodeCursor(id: string, timestamp: string): string {
  return Buffer.from(JSON.stringify({ i: id, u: timestamp })).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): DecodedCursor | undefined {
  if (!cursor) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "i" in parsed &&
      "u" in parsed &&
      typeof parsed.i === "string" &&
      typeof parsed.u === "string" &&
      uuidPattern.test(parsed.i) &&
      isoTimestampPattern.test(parsed.u)
    ) {
      return { id: parsed.i, timestamp: parsed.u };
    }
  } catch {
    // Fall through — a cursor that does not decode is treated as absent.
  }

  return undefined;
}
