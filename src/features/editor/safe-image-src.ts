// Image sources the editor will put in the DOM (09_SECURITY §9 T4). Only
// absolute http(s) URLs and same-origin root-relative paths render; anything
// else (javascript:, data:, vbscript:, protocol-relative `//host`, bare
// relative paths) renders without a `src`. The attribute itself is kept in the
// document model, so the note's markdown still round-trips unchanged
// (FR-NOTE-2) — sanitization is a render-time decision, not a data rewrite.
export function isSafeImageSrc(src: unknown): src is string {
  if (typeof src !== "string") {
    return false;
  }

  // Strip ASCII control characters and whitespace browsers ignore inside a
  // scheme (`java\tscript:`), then test.
  // eslint-disable-next-line no-control-regex
  const normalized = src.replace(/[\u0000- ]/g, "");

  if (/^https?:\/\//i.test(normalized)) {
    return true;
  }

  return (
    normalized.startsWith("/") && !normalized.startsWith("//") && !normalized.startsWith("/\\")
  );
}
