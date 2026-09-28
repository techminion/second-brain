import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Graph } from "../types";
import { GraphView } from "./graph-view";

const push = vi.fn();
const fetchGraph = vi.fn();
const fetchLocalGraph = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../graph-api", () => ({
  fetchGraph: (...args: unknown[]) => fetchGraph(...args),
  fetchLocalGraph: (...args: unknown[]) => fetchLocalGraph(...args),
}));
vi.mock("@/features/search/search-api", () => ({
  fetchTags: () => Promise.resolve([{ id: "t1", name: "Research" }]),
}));
vi.mock("@/features/folders/folder-api", () => ({
  fetchFolderTree: () =>
    Promise.resolve([
      { children: [], createdAt: "", id: "f1", name: "Work", parentFolderId: null, updatedAt: "" },
    ]),
}));
// React Flow needs real layout APIs; render its nodes through our node type so
// the data the canvas receives (faded/highlight/current/orphan) is testable.
vi.mock("@xyflow/react", () => ({
  Controls: () => null,
  Handle: () => null,
  Position: { Bottom: "bottom", Top: "top" },
  ReactFlow: ({
    nodes,
    nodeTypes,
  }: {
    nodes: { id: string; data: Record<string, unknown> }[];
    nodeTypes: Record<string, (props: { data: Record<string, unknown> }) => ReactNode>;
  }) => (
    <div>
      {nodes.map((node) => (
        <div data-node-id={node.id} key={node.id}>
          {nodeTypes.note({ data: node.data })}
        </div>
      ))}
    </div>
  ),
}));

const sample: Graph = {
  edges: [
    { sourceId: "a", targetId: "b" },
    { sourceId: "b", targetId: "c" },
  ],
  nodes: [
    { id: "a", title: "Alpha", type: "note" },
    { id: "b", title: "Beta", type: "note" },
    { id: "c", title: "Gamma", type: "note" },
    { id: "d", title: "Orphan", type: "note" },
  ],
};

function renderView(mode: Parameters<typeof GraphView>[0]["mode"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GraphView mode={mode} />
    </QueryClientProvider>,
  );
}

function nodeElement(container: HTMLElement, id: string) {
  return container.querySelector(`[data-node-id="${id}"] > div`) as HTMLElement;
}

afterEach(() => vi.clearAllMocks());

describe("GraphView", () => {
  it("renders nodes and a synchronized, accessible notes list (GRAPH-04/11)", async () => {
    fetchGraph.mockResolvedValue(sample);
    const { container } = renderView({ kind: "global" });

    const list = await screen.findByRole("navigation", { name: "Notes in graph" });
    expect(list).toHaveTextContent("Beta");
    expect(screen.getByRole("button", { name: /Beta.*2 links/ })).toBeInTheDocument();
    expect(nodeElement(container, "d")).toHaveAttribute("data-orphan", "true");
    expect(nodeElement(container, "a")).toHaveAttribute("data-orphan", "false");
  });

  it("opens a note from a node click or the list (GRAPH-05)", async () => {
    fetchGraph.mockResolvedValue(sample);
    const { container } = renderView({ kind: "global" });
    await screen.findByRole("navigation", { name: "Notes in graph" });

    fireEvent.click(nodeElement(container, "a"));
    expect(push).toHaveBeenLastCalledWith("/notes/a");

    fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
    expect(push).toHaveBeenLastCalledWith("/notes/c");
  });

  it("highlights a node's neighborhood and fades the rest on list focus (GRAPH-06/11)", async () => {
    fetchGraph.mockResolvedValue(sample);
    const { container } = renderView({ kind: "global" });
    await screen.findByRole("navigation", { name: "Notes in graph" });

    fireEvent.focus(screen.getByRole("button", { name: /Alpha/ }));

    expect(nodeElement(container, "a")).toHaveAttribute("data-highlight", "true");
    expect(nodeElement(container, "b")).toHaveAttribute("data-faded", "false");
    expect(nodeElement(container, "c")).toHaveAttribute("data-faded", "true");
    expect(nodeElement(container, "d")).toHaveAttribute("data-faded", "true");
  });

  it("never requests a local graph in global mode", async () => {
    fetchGraph.mockResolvedValue(sample);
    renderView({ kind: "global" });

    await screen.findByRole("navigation", { name: "Notes in graph" });
    expect(fetchLocalGraph).not.toHaveBeenCalled();
  });

  it("filters the global graph by tag chip (GRAPH-09)", async () => {
    fetchGraph.mockResolvedValue(sample);
    renderView({ kind: "global" });

    fireEvent.click(await screen.findByRole("button", { name: "#Research" }));

    await waitFor(() =>
      expect(fetchGraph).toHaveBeenLastCalledWith({ folderId: undefined, tagId: "t1" }),
    );
    expect(screen.getByRole("button", { name: "#Research" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("filters by folder chip", async () => {
    fetchGraph.mockResolvedValue(sample);
    renderView({ kind: "global" });

    fireEvent.click(await screen.findByRole("button", { name: "Work" }));

    await waitFor(() =>
      expect(fetchGraph).toHaveBeenLastCalledWith({ folderId: "f1", tagId: undefined }),
    );
  });

  it("shows a local graph with the current note highlighted and depth links (GRAPH-10)", async () => {
    fetchLocalGraph.mockResolvedValue(sample);
    const { container } = renderView({ depth: 2, kind: "local", noteId: "b" });

    await screen.findByRole("heading", { name: "Local graph" });
    await waitFor(() => expect(fetchLocalGraph).toHaveBeenCalledWith("b", 2));
    expect(fetchGraph).not.toHaveBeenCalled();
    expect(nodeElement(container, "b")).toHaveAttribute("data-current", "true");
    expect(screen.getByRole("link", { name: "Whole graph" })).toHaveAttribute("href", "/graph");
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute(
      "href",
      "/graph?note=b&depth=3",
    );
    expect(screen.queryByRole("group", { name: "Tag" })).not.toBeInTheDocument();
  });

  it("teaches linking when the graph is empty (GRAPH-15)", async () => {
    fetchGraph.mockResolvedValue({ edges: [], nodes: [] });
    renderView({ kind: "global" });

    expect(await screen.findByText("Your graph is empty.")).toBeInTheDocument();
  });

  it("hints at linking when notes exist but nothing is linked", async () => {
    fetchGraph.mockResolvedValue({ edges: [], nodes: sample.nodes });
    renderView({ kind: "global" });

    expect(await screen.findByText(/No links yet/)).toBeInTheDocument();
  });
});
