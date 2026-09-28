import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FolderTreeNode } from "@/features/folders/types";
import { folderDragType, noteDragType } from "@/shared/lib/drag-data";

import { FolderTree } from "./folder-tree";

const push = vi.fn();
const replace = vi.fn();
const createMutate = vi.fn();
const renameMutate = vi.fn();
const moveMutate = vi.fn();
const deleteMutate = vi.fn();
const updateNoteRequest = vi.fn();
let tree: FolderTreeNode[] = [];

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push, replace }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/features/notes/note-api", () => ({
  updateNoteRequest: (...args: unknown[]) => updateNoteRequest(...args),
}));
vi.mock("../hooks/use-folders", () => ({
  useCreateFolder: () => ({ mutate: createMutate }),
  useDeleteFolder: () => ({ isPending: false, mutate: deleteMutate }),
  useFolderTree: () => ({ data: tree, isError: false, isPending: false }),
  useMoveFolder: () => ({ mutate: moveMutate }),
  useRenameFolder: () => ({ mutate: renameMutate }),
}));

function node(id: string, name: string, children: FolderTreeNode[] = []): FolderTreeNode {
  return { children, createdAt: "", id, name, parentFolderId: null, updatedAt: "" };
}

function renderTree() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<FolderTree />, { wrapper });
}

function dataTransfer(type: string, value: string) {
  return {
    dropEffect: "none",
    getData: (requested: string) => (requested === type ? value : ""),
    types: [type],
  };
}

afterEach(() => {
  vi.clearAllMocks();
  tree = [];
});

describe("FolderTree", () => {
  it("shows an empty state and creates a root folder inline", () => {
    renderTree();

    expect(screen.getByText("No folders yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New folder" }));
    const input = screen.getByRole("textbox", { name: "New folder name" });
    fireEvent.change(input, { target: { value: "  Projects " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(createMutate).toHaveBeenCalledWith(
      { name: "Projects", parentFolderId: null },
      expect.any(Object),
    );
  });

  it("renders an ARIA tree with one tab stop and expands with the keyboard", () => {
    tree = [node("a", "Alpha", [node("b", "Beta")]), node("d", "Delta")];
    renderTree();

    const treeElement = screen.getByRole("tree", { name: "Folders" });
    const alpha = within(treeElement).getByRole("treeitem", { name: "Alpha" });
    const delta = within(treeElement).getByRole("treeitem", { name: "Delta" });

    expect(alpha).toHaveAttribute("tabindex", "0");
    expect(delta).toHaveAttribute("tabindex", "-1");
    expect(alpha).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("treeitem", { name: "Beta" })).not.toBeInTheDocument();

    alpha.focus();
    fireEvent.keyDown(alpha, { key: "ArrowRight" });
    expect(alpha).toHaveAttribute("aria-expanded", "true");
    const beta = screen.getByRole("treeitem", { name: "Beta" });
    expect(beta).toHaveAttribute("aria-level", "2");

    fireEvent.keyDown(alpha, { key: "ArrowDown" });
    expect(beta).toHaveFocus();

    fireEvent.keyDown(beta, { key: "ArrowLeft" });
    expect(alpha).toHaveFocus();

    fireEvent.keyDown(alpha, { key: "End" });
    expect(delta).toHaveFocus();

    fireEvent.keyDown(delta, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/folders/d");
  });

  it("renames with F2", () => {
    tree = [node("a", "Alpha")];
    renderTree();

    const alpha = screen.getByRole("treeitem", { name: "Alpha" });
    fireEvent.keyDown(alpha, { key: "F2" });
    const input = screen.getByRole("textbox", { name: "Rename folder Alpha" });
    fireEvent.change(input, { target: { value: "Archive" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(renameMutate).toHaveBeenCalledWith({ id: "a", name: "Archive" }, expect.any(Object));
  });

  it("requires an explicit contents choice before deleting (FR-FOLDER-3)", () => {
    tree = [node("a", "Alpha")];
    renderTree();

    fireEvent.keyDown(screen.getByRole("treeitem", { name: "Alpha" }), { key: "Delete" });

    expect(screen.getByRole("heading", { name: "Delete folder “Alpha”?" })).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Delete folder" });
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /Keep contents/ }));
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    expect(deleteMutate).toHaveBeenCalledWith(
      { id: "a", strategy: "move_to_parent" },
      expect.any(Object),
    );
  });

  it("moves a dropped note into the folder and a dropped folder into another", async () => {
    tree = [node("a", "Alpha"), node("d", "Delta")];
    updateNoteRequest.mockResolvedValue({ id: "n1" });
    renderTree();

    const alphaRow = screen.getByRole("treeitem", { name: "Alpha" }).firstElementChild as Element;
    fireEvent.drop(alphaRow, { dataTransfer: dataTransfer(noteDragType, "n1") });
    expect(updateNoteRequest).toHaveBeenCalledWith("n1", { folderId: "a" });

    fireEvent.drop(alphaRow, { dataTransfer: dataTransfer(folderDragType, "d") });
    expect(moveMutate).toHaveBeenCalledWith({ id: "d", parentFolderId: "a" }, expect.any(Object));
  });

  it("moves a folder dropped on the header to the root", () => {
    tree = [node("a", "Alpha")];
    renderTree();

    const header = screen.getByRole("heading", { name: "Folders" }).parentElement as Element;
    fireEvent.drop(header, { dataTransfer: dataTransfer(folderDragType, "x") });

    expect(moveMutate).toHaveBeenCalledWith({ id: "x", parentFolderId: null }, expect.any(Object));
  });
});
