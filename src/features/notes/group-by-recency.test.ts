import { describe, expect, it } from "vitest";

import { groupByRecency } from "./group-by-recency";

const now = new Date(2026, 9, 1, 9, 30);

function at(daysAgo: number, hour = 12): { id: string; updatedAt: string } {
  const date = new Date(2026, 9, 1 - daysAgo, hour);
  return { id: `d${daysAgo}h${hour}`, updatedAt: date.toISOString() };
}

describe("groupByRecency", () => {
  it("buckets by local calendar day and keeps input order", () => {
    const items = [at(0, 8), at(0, 1), at(1), at(3), at(7), at(8), at(30), at(31)];

    const groups = groupByRecency(items, (item) => item.updatedAt, now);

    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ["Today", ["d0h8", "d0h1"]],
      ["Yesterday", ["d1h12"]],
      ["Previous 7 days", ["d3h12", "d7h12"]],
      ["Previous 30 days", ["d8h12", "d30h12"]],
      ["Older", ["d31h12"]],
    ]);
  });

  it("treats a clock-skewed future edit as today and drops empty buckets", () => {
    const groups = groupByRecency([at(-1)], (item) => item.updatedAt, now);

    expect(groups.map((group) => group.label)).toEqual(["Today"]);
  });
});
