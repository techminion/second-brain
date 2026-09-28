import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FolderTreeNode } from "@/features/folders/types";

import { FolderHeader } from "./folder-header";
import { FolderPicker } from "./folder-picker";

let tree: FolderTreeNode[] = [];
let isPending = false;

vi.mock("../hooks/use-folders", () => ({
  useFolderTree: () => ({ data: tree, isPending }),
}));

function node(id: string, name: string, children: FolderTreeNode[] = []): FolderTreeNode {
  return { children, createdAt: "", id, name, parentFolderId: null, updatedAt: "" };
}

afterEach(() => {
  tree = [];
  isPending = false;
});

describe("FolderPicker", () => {
  it("lists every folder by path and reports the choice", () => {
    tree = [node("a", "Work", [node("b", "Q3")])];
    const onChange = vi.fn();
    render(<FolderPicker onChange={onChange} value={null} />);

    const select = screen.getByLabelText("Folder");
    expect(screen.getByRole("option", { name: "Work / Q3" })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("b");

    fireEvent.change(select, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe("FolderHeader", () => {
  it("shows the breadcrumb path, name, and subfolders", () => {
    tree = [node("a", "Work", [node("b", "Q3", [node("c", "Launch")])])];
    render(<FolderHeader folderId="b" />);

    expect(screen.getByRole("heading", { name: "Q3" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Work" })).toHaveAttribute("href", "/folders/a");
    expect(screen.getByRole("link", { name: "Launch" })).toHaveAttribute("href", "/folders/c");
  });

  it("explains a missing folder", () => {
    render(<FolderHeader folderId="zz" />);

    expect(screen.getByRole("status")).toHaveTextContent("doesn’t exist");
  });
});
