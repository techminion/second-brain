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
  it("names the current folder and lists every folder by path", () => {
    tree = [node("a", "Work", [node("b", "Q3")])];
    const onChange = vi.fn();
    render(<FolderPicker onChange={onChange} value="b" />);

    const trigger = screen.getByRole("button", { name: "Folder: Work / Q3. Move note" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(screen.getByRole("menuitemradio", { name: "Work / Q3" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Work" }));
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("reports no folder as null", () => {
    tree = [node("a", "Work")];
    const onChange = vi.fn();
    render(<FolderPicker onChange={onChange} value="a" />);

    fireEvent.keyDown(screen.getByRole("button", { name: "Folder: Work. Move note" }), {
      key: "Enter",
    });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "No folder" }));

    expect(onChange).toHaveBeenCalledWith(null);
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
