import { describe, expect, it } from "vitest";

import { isIsoDate, localIsoDate, shiftIsoDate } from "./daily-note-date";

describe("daily note dates", () => {
  it("accepts only real YYYY-MM-DD calendar dates", () => {
    expect(isIsoDate("2026-09-27")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-9-27")).toBe(false);
    expect(isIsoDate("2026-09-27T00:00:00Z")).toBe(false);
    expect(isIsoDate(20260927)).toBe(false);
  });

  it("formats the local calendar date", () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("shifts across month and year boundaries", () => {
    expect(shiftIsoDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftIsoDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftIsoDate("2024-03-01", -1)).toBe("2024-02-29");
  });
});
