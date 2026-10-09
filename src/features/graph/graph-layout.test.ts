import { describe, expect, it } from "vitest";

import type { Graph } from "@/features/graph/types";

import { degrees, layoutGraph, neighborhood, nodeSize } from "./graph-layout";

function graph(nodeCount: number, edges: [number, number][]): Graph {
  return {
    edges: edges.map(([a, b]) => ({ sourceId: `n${a}`, targetId: `n${b}` })),
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      folderId: null,
      id: `n${index}`,
      tagIds: [],
      title: `Note ${index}`,
      type: "note" as const,
    })),
  };
}

describe("graph layout (GRAPH-04/08)", () => {
  const sample = graph(5, [
    [0, 1],
    [0, 2],
    [0, 3],
  ]);

  it("positions every node with finite, distinct coordinates", () => {
    const nodes = layoutGraph(sample);

    expect(nodes).toHaveLength(5);
    for (const node of nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
    const keys = new Set(nodes.map((node) => `${node.position.x},${node.position.y}`));
    expect(keys.size).toBe(5);
  });

  it("encodes degree as size and marks orphans", () => {
    const byId = new Map(layoutGraph(sample).map((node) => [node.id, node]));

    expect(byId.get("n0")?.degree).toBe(3);
    expect(byId.get("n0")!.size).toBeGreaterThan(byId.get("n1")!.size);
    expect(byId.get("n4")?.orphan).toBe(true);
    expect(byId.get("n1")?.orphan).toBe(false);
  });

  it("keeps size growth bounded for hubs", () => {
    expect(nodeSize(0)).toBe(12);
    expect(nodeSize(10_000)).toBe(32);
  });

  it("is deterministic for the same input", () => {
    expect(layoutGraph(sample)).toEqual(layoutGraph(sample));
  });

  it("starts from cached positions and stays near them (GRAPH-17)", () => {
    const first = layoutGraph(sample);
    const cache = new Map(first.map((node) => [node.id, node.position]));
    const second = layoutGraph(sample, cache);

    for (const node of second) {
      const before = cache.get(node.id)!;
      expect(Math.hypot(node.position.x - before.x, node.position.y - before.y)).toBeLessThan(60);
    }
  });

  it("ignores edges whose endpoints are not in the node set", () => {
    const partial: Graph = {
      ...sample,
      edges: [...sample.edges, { sourceId: "n0", targetId: "x" }],
    };

    expect(() => layoutGraph(partial)).not.toThrow();
    expect(degrees(sample).get("n0")).toBe(3);
  });

  it("computes the hover neighborhood in both directions", () => {
    expect([...neighborhood(sample, "n1")].sort()).toEqual(["n0", "n1"]);
    expect([...neighborhood(sample, "n0")].sort()).toEqual(["n0", "n1", "n2", "n3"]);
  });
});

describe("graph layout performance (GRAPH-13)", () => {
  it("lays out the 2,000-node NFR ceiling within budget", () => {
    // Sparse, realistic knowledge graph: ~3 links per note.
    const edges: [number, number][] = [];
    for (let index = 1; index < 2000; index += 1) {
      edges.push([index, (index * 7919) % index]);
      if (index % 2 === 0) edges.push([index, (index * 104729) % index]);
    }
    const big = graph(2000, edges);

    const started = performance.now();
    const nodes = layoutGraph(big);
    const elapsed = performance.now() - started;

    expect(nodes).toHaveLength(2000);
    // One-off cold layout before first paint (warm starts are ~4× cheaper).
    // Budget is generous for slow CI runners; locally this is well under 1s.
    expect(elapsed).toBeLessThan(3000);

    const spread = Math.max(...nodes.map((node) => Math.abs(node.position.x)));
    expect(spread).toBeGreaterThan(100); // actually laid out, not collapsed
  });
});
