import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { localIsoDate, shiftIsoDate } from "../daily-note-date";
import { DailyNoteNavigation } from "./daily-note-navigation";
import { DailyNotePager } from "./daily-note-pager";
import { OpenTodayRedirect } from "./open-today-redirect";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

afterEach(() => {
  push.mockReset();
  replace.mockReset();
});

describe("DailyNoteNavigation", () => {
  it("links Today to /daily and shows its shortcut", () => {
    render(<DailyNoteNavigation />);

    expect(screen.getByRole("heading", { name: "Daily note" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Today/ })).toHaveAttribute("href", "/daily");
  });

  it("opens the chosen date's note", () => {
    render(<DailyNoteNavigation />);
    const input = screen.getByLabelText("Open daily note for date");

    fireEvent.change(input, { target: { value: "2026-09-01" } });

    expect(push).toHaveBeenCalledWith("/daily/2026-09-01");
  });
});

describe("DailyNotePager", () => {
  it("links to the previous and next calendar days", () => {
    render(<DailyNotePager date="2026-01-01" />);

    expect(screen.getByRole("link", { name: "Previous day, 2025-12-31" })).toHaveAttribute(
      "href",
      "/daily/2025-12-31",
    );
    expect(screen.getByRole("link", { name: "Next day, 2026-01-02" })).toHaveAttribute(
      "href",
      "/daily/2026-01-02",
    );
  });
});

describe("OpenTodayRedirect", () => {
  it("replaces the route with the local date", () => {
    render(<OpenTodayRedirect />);

    expect(replace).toHaveBeenCalledWith(`/daily/${localIsoDate()}`);
  });

  it("applies a day offset", () => {
    render(<OpenTodayRedirect offsetDays={-1} />);

    expect(replace).toHaveBeenCalledWith(`/daily/${shiftIsoDate(localIsoDate(), -1)}`);
  });
});
