import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LegendEntry } from "../graph-colours";
import { GraphLegend } from "./graph-legend";

const entries: LegendEntry[] = [
  { colour: 1, count: 3, id: "f1", kind: "group", name: "Work" },
  { colour: 2, count: 1, id: "f2", kind: "group", name: "Home" },
  { colour: null, count: 4, id: null, kind: "other", name: "Other" },
  { colour: null, count: 2, id: null, kind: "none", name: "No folder" },
];

describe("GraphLegend (UX-11)", () => {
  it("renders nothing without entries", () => {
    const { container } = render(<GraphLegend entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists swatch, name and count for every entry", () => {
    render(<GraphLegend entries={entries} />);

    const legend = screen.getByRole("region", { name: "Graph legend" });
    const items = within(legend).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Work3",
      "Home1",
      "Other4",
      "No folder2",
    ]);
    expect(within(legend).queryByRole("button")).not.toBeInTheDocument();
  });

  it("makes group entries filter buttons, marking the active one", () => {
    const onSelect = vi.fn();
    render(<GraphLegend activeId="f2" entries={entries} onSelect={onSelect} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^Home, 1 note/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /^Work, 3 notes/ }));
    expect(onSelect).toHaveBeenCalledWith("f1");
  });

  it("explains the multi-tag ring when asked", () => {
    render(<GraphLegend entries={entries} showMultiHint />);
    expect(screen.getByText("Ring: more than one tag")).toBeInTheDocument();
  });
});
