import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeDashboard } from "./home-dashboard";
import { NewNoteButton } from "./new-note-button";

const useNotesList = vi.fn();
const createAndOpen = vi.fn();

vi.mock("../hooks/use-notes-list", () => ({ useNotesList: () => useNotesList() }));
vi.mock("../hooks/use-create-and-open-note", () => ({
  useCreateAndOpenNote: () => ({ createAndOpen, isPending: false }),
}));
vi.mock("../daily-note-date", () => ({ localIsoDate: () => "2026-10-09" }));

interface Item {
  id: string;
  title: string;
  body?: string;
  dailyNoteDate?: string | null;
  updatedAt?: string;
}

function resolved(items: Item[]) {
  return {
    data: {
      pageParams: [undefined],
      pages: [
        {
          items: items.map((item) => ({
            body: "",
            dailyNoteDate: null,
            updatedAt: "2026-10-09T10:00:00Z",
            ...item,
          })),
        },
      ],
    },
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  };
}

// The real onboarding lives in the shell and is composed by the app layer
// (page.tsx); a stand-in keeps this test inside the notes feature boundary.
function renderHome() {
  return render(
    <HomeDashboard
      emptyState={
        <section aria-labelledby="empty">
          <h1 id="empty">Your knowledge graph is empty</h1>
          <NewNoteButton />
        </section>
      }
    />,
  );
}

afterEach(() => {
  useNotesList.mockReset();
  createAndOpen.mockReset();
});

describe("HomeDashboard", () => {
  it("shows a busy skeleton while loading, never the empty state", () => {
    useNotesList.mockReturnValue({ data: undefined, isError: false, isPending: true });

    const { container } = renderHome();

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your notes…");
    expect(screen.queryByText("Your knowledge graph is empty")).not.toBeInTheDocument();
  });

  it("shows an alert with Retry on error", () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    useNotesList.mockReturnValue({ data: undefined, isError: true, isPending: false, refetch });

    renderHome();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load your notes");
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Your knowledge graph is empty")).not.toBeInTheDocument();
  });

  it("shows the onboarding with a working New note button when there are no notes", () => {
    useNotesList.mockReturnValue(resolved([]));

    renderHome();

    expect(
      screen.getByRole("heading", { level: 1, name: "Your knowledge graph is empty" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(createAndOpen).toHaveBeenCalledTimes(1);
  });

  it("shows Home with recent notes instead of the empty state", () => {
    const items: Item[] = Array.from({ length: 10 }, (_, i) => ({
      id: `n${i}`,
      title: `Note ${i}`,
    }));
    items[1] = { id: "n1", title: "" };
    items[2] = { body: "# Goals\n\nShip **search**", id: "n2", title: "Roadmap" };
    useNotesList.mockReturnValue(resolved(items));

    renderHome();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Recent notes" })).toBeInTheDocument();
    expect(screen.queryByText("Your knowledge graph is empty")).not.toBeInTheDocument();

    const list = screen.getByRole("list", { name: "Recent notes" });
    const links = within(list).getAllByRole("link");
    expect(links).toHaveLength(8);
    expect(links[0]).toHaveAttribute("href", "/notes/n0");
    expect(links[7]).toHaveAttribute("href", "/notes/n7");
    expect(links[1]).toHaveTextContent("Untitled");
    expect(links[2]).toHaveTextContent("Goals Ship search");
    expect(within(list).getAllByRole("time")).toHaveLength(8);
  });

  it("links the Today card to today's daily note when it exists", () => {
    useNotesList.mockReturnValue(
      resolved([
        { id: "other", title: "Other" },
        { body: "Standup notes", dailyNoteDate: "2026-10-09", id: "daily", title: "2026-10-09" },
      ]),
    );

    renderHome();

    const today = screen.getByRole("region", { name: "Today" });
    const link = within(today).getByRole("link");
    expect(link).toHaveAttribute("href", "/notes/daily");
    expect(link).toHaveTextContent("Standup notes");
    expect(link).toHaveTextContent("Edited");
  });

  it("sends the Today card to /daily when today's note does not exist yet", () => {
    useNotesList.mockReturnValue(
      resolved([{ dailyNoteDate: "2026-10-08", id: "yesterday", title: "2026-10-08" }]),
    );

    renderHome();

    const today = screen.getByRole("region", { name: "Today" });
    expect(within(today).getByRole("link", { name: /Open today's note/ })).toHaveAttribute(
      "href",
      "/daily",
    );
  });

  it("offers quick actions for New note, Today, Search and Graph", () => {
    useNotesList.mockReturnValue(resolved([{ id: "n1", title: "One" }]));

    renderHome();

    const actions = screen.getByRole("navigation", { name: "Quick actions" });
    fireEvent.click(within(actions).getByRole("button", { name: "New note" }));
    expect(createAndOpen).toHaveBeenCalledTimes(1);
    expect(within(actions).getByRole("link", { name: /Today/ })).toHaveAttribute("href", "/daily");
    expect(within(actions).getByRole("link", { name: /Search/ })).toHaveAttribute(
      "href",
      "/search",
    );
    expect(within(actions).getByRole("link", { name: /Graph/ })).toHaveAttribute("href", "/graph");
  });
});
