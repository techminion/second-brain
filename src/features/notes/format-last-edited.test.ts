import { describe, expect, it } from "vitest";

import { formatLastEdited } from "./format-last-edited";

const now = new Date("2026-07-24T12:00:00Z");

describe("formatLastEdited", () => {
  it("shows 'just now' under a minute", () => {
    expect(formatLastEdited("2026-07-24T11:59:30Z", now)).toBe("just now");
  });

  it("shows minutes, hours, and days within the last week", () => {
    expect(formatLastEdited("2026-07-24T11:55:00Z", now)).toBe("5m ago");
    expect(formatLastEdited("2026-07-24T09:00:00Z", now)).toBe("3h ago");
    expect(formatLastEdited("2026-07-22T12:00:00Z", now)).toBe("2d ago");
  });

  it("falls back to a short date beyond a week", () => {
    expect(formatLastEdited("2026-07-01T12:00:00Z", now)).toMatch(/\w+ \d+|\d+ \w+/);
  });

  it("treats a future timestamp as 'just now'", () => {
    expect(formatLastEdited("2026-07-24T12:05:00Z", now)).toBe("just now");
  });
});
