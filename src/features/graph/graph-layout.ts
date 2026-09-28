import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

import type { Graph } from "@/features/graph/types";

// Force-directed layout for the graph canvas (GRAPH-04, 10_DESIGN §10, ADR-33).
// Pure and synchronous: the simulation runs to a fixed tick budget off-screen
// and React Flow only renders the result, so layout cost is testable (GRAPH-13)
// and re-opening the graph can start from cached positions (GRAPH-17).

export interface Point {
  x: number;
  y: number;
}

export interface LaidOutNode {
  id: string;
  title: string;
  degree: number;
  orphan: boolean;
  /** Visual diameter in px — grows subtly with connection count (GRAPH-08). */
  size: number;
  position: Point;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
}

const baseSize = 12;
const maxExtraSize = 20;
// Tick budgets: large graphs settle in fewer ticks with a matching faster
// cooling rate (alpha reaches alphaMin exactly at the budget), and skip the
// O(n log n) collision force — Barnes-Hut charge alone spaces them well.
const largeGraph = 500;
const alphaMin = 0.001;

function tickBudget(nodeCount: number, warm: boolean): number {
  if (warm) {
    return nodeCount > largeGraph ? 30 : 60;
  }
  return nodeCount > largeGraph ? 120 : 300;
}

/** Diameter: logarithmic in degree so hubs read as hubs without dwarfing leaves. */
export function nodeSize(degree: number): number {
  return Math.round(baseSize + Math.min(maxExtraSize, Math.log2(1 + degree) * 5));
}

export function degrees(graph: Graph): Map<string, number> {
  const counts = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) {
    counts.set(edge.sourceId, (counts.get(edge.sourceId) ?? 0) + 1);
    counts.set(edge.targetId, (counts.get(edge.targetId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Lay the graph out. Nodes with a cached position start there and the
 * simulation only warms up (fewer ticks); a cold start runs the full budget.
 */
export function layoutGraph(
  graph: Graph,
  cached: ReadonlyMap<string, Point> = new Map(),
): LaidOutNode[] {
  const counts = degrees(graph);
  const simNodes: SimNode[] = graph.nodes.map((node) => {
    const known = cached.get(node.id);
    return known ? { id: node.id, x: known.x, y: known.y } : { id: node.id };
  });
  const ids = new Set(simNodes.map((node) => node.id));
  const links: SimulationLinkDatum<SimNode>[] = graph.edges
    .filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId))
    .map((edge) => ({ source: edge.sourceId, target: edge.targetId }));

  const allCached = simNodes.length > 0 && simNodes.every((node) => cached.has(node.id));
  const ticks = tickBudget(simNodes.length, allCached);
  const large = simNodes.length > largeGraph;

  const simulation = forceSimulation(simNodes)
    .alphaMin(alphaMin)
    .alphaDecay(1 - Math.pow(alphaMin, 1 / ticks))
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .id((node) => node.id)
        .distance(80),
    )
    .force("charge", forceManyBody<SimNode>().strength(-220).theta(0.9))
    .force("collide", large ? null : forceCollide<SimNode>(24))
    .force("center", forceCenter(0, 0))
    .stop();

  if (allCached) {
    simulation.alpha(0.3);
  }
  simulation.tick(ticks);

  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return simNodes.map((simNode) => {
    const degree = counts.get(simNode.id) ?? 0;
    return {
      degree,
      id: simNode.id,
      orphan: degree === 0,
      position: { x: Math.round(simNode.x ?? 0), y: Math.round(simNode.y ?? 0) },
      size: nodeSize(degree),
      title: byId.get(simNode.id)?.title ?? "",
    };
  });
}

/** Ids of a node and its direct neighbors — the hover highlight set (GRAPH-06). */
export function neighborhood(graph: Graph, id: string): Set<string> {
  const set = new Set([id]);
  for (const edge of graph.edges) {
    if (edge.sourceId === id) {
      set.add(edge.targetId);
    } else if (edge.targetId === id) {
      set.add(edge.sourceId);
    }
  }
  return set;
}

const cacheKey = "second-brain:graph-layout";

/** Cached positions (GRAPH-17); best-effort per browser, never required. */
export function readLayoutCache(): Map<string, Point> {
  try {
    const raw = window.sessionStorage.getItem(cacheKey);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, Point] => {
        const value = entry[1] as Partial<Point> | null;
        return typeof value?.x === "number" && typeof value.y === "number";
      },
    );
    return new Map(entries);
  } catch {
    return new Map();
  }
}

export function writeLayoutCache(nodes: LaidOutNode[]): void {
  try {
    const current = Object.fromEntries(readLayoutCache());
    for (const node of nodes) {
      current[node.id] = node.position;
    }
    window.sessionStorage.setItem(cacheKey, JSON.stringify(current));
  } catch {
    // Ignore — the cache only saves simulation time.
  }
}
