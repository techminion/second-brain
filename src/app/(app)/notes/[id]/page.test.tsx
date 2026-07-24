import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NotePage from "./page";

vi.mock("@/features/notes/components/note-view", () => ({
  NoteView: ({ noteId }: { noteId: string }) => <div>view:{noteId}</div>,
}));

describe("NotePage", () => {
  it("resolves the route id and renders the note view for it", async () => {
    render(await NotePage({ params: Promise.resolve({ id: "note-123" }) }));

    expect(screen.getByText("view:note-123")).toBeInTheDocument();
  });
});
