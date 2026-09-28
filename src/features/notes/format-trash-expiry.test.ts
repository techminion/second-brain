import { describe, expect, it } from "vitest";

import { formatTrashExpiry } from "./format-trash-expiry";

describe("formatTrashExpiry", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");

  it("counts whole days left in the 30-day window", () => {
    expect(formatTrashExpiry("2026-08-31T12:00:00.000Z", now)).toBe("Deletes in 30 days");
    expect(formatTrashExpiry("2026-08-11T12:00:00.000Z", now)).toBe("Deletes in 10 days");
  });

  it("rounds partial days up and singularizes one day", () => {
    expect(formatTrashExpiry("2026-08-02T00:00:00.000Z", now)).toBe("Deletes in 1 day");
  });

  it("reports imminent deletion once the window has closed", () => {
    expect(formatTrashExpiry("2026-08-01T12:00:00.000Z", now)).toBe("Deleting soon");
    expect(formatTrashExpiry("2026-07-01T00:00:00.000Z", now)).toBe("Deleting soon");
  });
});
