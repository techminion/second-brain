"use client";

import "@xyflow/react/dist/style.css";

import { useQuery } from "@tanstack/react-query";
import {
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import { Network } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";

import { fetchFolderTree } from "@/features/folders/folder-api";
import { fetchTags } from "@/features/search/search-api";
import { foldersRootKey, tagsRootKey } from "@/shared/lib/query-keys";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

import { assignGraphColours, type ColourBy, colourByOptions } from "../graph-colours";
import { layoutGraph, neighborhood, readLayoutCache, writeLayoutCache } from "../graph-layout";
import { useGlobalGraph, useLocalGraph } from "../hooks/use-graph";
import type { Graph } from "../types";
import { graphColourVar, GraphLegend } from "./graph-legend";
import styles from "./graph-view.module.css";

const colourByStorageKey = "margin.graph.colourBy";

function readColourBy(): ColourBy {
  try {
    const stored = window.localStorage.getItem(colourByStorageKey);
    return colourByOptions.some((option) => option.value === stored)
      ? (stored as ColourBy)
      : "none";
  } catch {
    return "none";
  }
}

export type GraphViewMode = { kind: "global" } | { kind: "local"; noteId: string; depth: number };

interface NoteNodeData extends Record<string, unknown> {
  onOpen: () => void;
  title: string;
  size: number;
  orphan: boolean;
  current: boolean;
  highlight: boolean;
  faded: boolean;
  /** UX-11: palette slot 1..8, or null for the default dot. */
  colour: number | null;
  /** UX-11: more than one tag, drawn as a ring. */
  multi: boolean;
  /** UX-11: the group in words (screen readers), or null when not colouring. */
  groupLabel: string | null;
}

type NoteNode = Node<NoteNodeData, "note">;

function NoteNodeView({ data }: NodeProps<NoteNode>) {
  return (
    <div
      className={styles.node}
      data-current={data.current}
      data-faded={data.faded}
      data-highlight={data.highlight}
      data-multi={data.multi}
      data-orphan={data.orphan}
      onClick={data.onOpen}
    >
      {/* Invisible handles pinned to the dot's center, so straight edges run
          center to center as in any force-directed graph. */}
      <Handle
        isConnectable={false}
        position={Position.Top}
        style={{ ...centerHandle, top: data.size / 2 }}
        type="target"
      />
      <span
        className={styles.dot}
        style={
          {
            "--node-colour": graphColourVar(data.colour),
            height: data.size,
            width: data.size,
          } as CSSProperties
        }
      />
      <span className={styles.label}>
        {data.title || "Untitled"}
        {data.groupLabel ? <span className="sr-only">, {data.groupLabel}</span> : null}
      </span>
      <Handle
        isConnectable={false}
        position={Position.Top}
        style={{ ...centerHandle, top: data.size / 2 }}
        type="source"
      />
    </div>
  );
}

const nodeTypes = { note: NoteNodeView };

const centerHandle = { border: 0, height: 1, minHeight: 0, minWidth: 0, opacity: 0, width: 1 };

interface FilterChip {
  id: string;
  label: string;
}

function Chips({
  active,
  chips,
  label,
  onChange,
}: {
  active: string | undefined;
  chips: FilterChip[];
  label: string;
  onChange: (id: string | undefined) => void;
}) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div aria-label={label} className="flex flex-wrap items-center gap-1" role="group">
      <span className="text-muted-foreground text-xs">{label}:</span>
      {chips.map((chip) => (
        <button
          aria-pressed={active === chip.id}
          className={cn(
            "hover:bg-muted rounded-full border px-2 py-0.5 text-xs",
            active === chip.id && "bg-primary text-primary-foreground hover:bg-primary",
          )}
          key={chip.id}
          onClick={() => onChange(active === chip.id ? undefined : chip.id)}
          type="button"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

function ColourByControl({
  onChange,
  value,
}: Readonly<{ onChange: (value: ColourBy) => void; value: ColourBy }>) {
  return (
    <div aria-label="Colour by" className="flex items-center gap-1 text-xs" role="radiogroup">
      <span aria-hidden="true" className="text-muted-foreground">
        Colour by:
      </span>
      {colourByOptions.map((option) => (
        <label
          className="has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-ring hover:bg-muted cursor-pointer rounded-full border px-2 py-0.5 has-focus-visible:ring-2"
          key={option.value}
        >
          <input
            checked={value === option.value}
            className="sr-only"
            name="graph-colour-by"
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

/**
 * Knowledge graph (GRAPH-04..15, FR-GRAPH-1..4, 10_DESIGN §10): notes as
 * nodes, wiki links as edges. Click opens a note; hover (or focusing an item
 * in the synchronized list) highlights direct connections and fades the rest;
 * tag/folder chips filter the global graph; local mode shows a note and its
 * neighbors. Layout is computed off-screen and cached per browser session.
 */
export function GraphView({ mode }: Readonly<{ mode: GraphViewMode }>) {
  const router = useRouter();
  const [tagId, setTagId] = useState<string | undefined>();
  const [folderId, setFolderId] = useState<string | undefined>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // UX-11: None until mount (matches the server render), then the saved choice.
  const [colourBy, setColourByState] = useState<ColourBy>("none");

  useEffect(() => {
    setColourByState(readColourBy());
  }, []);

  const setColourBy = useCallback((next: ColourBy) => {
    setColourByState(next);
    try {
      window.localStorage.setItem(colourByStorageKey, next);
    } catch {
      // Private mode or a full quota: the choice still applies for this visit.
    }
  }, []);

  const global = useGlobalGraph({ folderId, tagId }, mode.kind === "global");
  const local = useLocalGraph(
    mode.kind === "local" ? mode.noteId : null,
    mode.kind === "local" ? mode.depth : 1,
  );
  const query = mode.kind === "local" ? local : global;
  const currentId = mode.kind === "local" ? mode.noteId : null;

  // Also loaded in local mode: the legend needs folder and tag names (UX-11).
  const tags = useQuery({
    queryFn: fetchTags,
    queryKey: [...tagsRootKey, "list"],
  });
  const folders = useQuery({
    queryFn: fetchFolderTree,
    queryKey: [...foldersRootKey, "tree"],
  });

  const graph: Graph | undefined = query.data;
  const laidOut = useMemo(() => (graph ? layoutGraph(graph, readLayoutCache()) : []), [graph]);

  useEffect(() => {
    if (laidOut.length > 0) {
      writeLayoutCache(laidOut);
    }
  }, [laidOut]);

  const colouring = useMemo(
    () =>
      assignGraphColours(graph?.nodes ?? [], colourBy, {
        folders: folders.data,
        tags: tags.data,
      }),
    [colourBy, folders.data, graph, tags.data],
  );

  const open = useCallback((id: string) => router.push(`/notes/${id}`), [router]);

  const highlightSet = useMemo(
    () => (graph && hoveredId ? neighborhood(graph, hoveredId) : null),
    [graph, hoveredId],
  );

  const nodes: NoteNode[] = useMemo(
    () =>
      laidOut.map((node) => ({
        data: {
          current: node.id === currentId,
          faded: highlightSet !== null && !highlightSet.has(node.id),
          highlight: node.id === hoveredId,
          onOpen: () => open(node.id),
          orphan: node.orphan,
          colour: colouring.byNode.get(node.id)?.colour ?? null,
          groupLabel: colouring.byNode.get(node.id)?.groupLabel ?? null,
          multi: colouring.byNode.get(node.id)?.multi ?? false,
          size: node.size,
          title: node.title,
        },
        // Non-draggable nodes are not "nopan" by default, so pressing one would
        // start a canvas pan that captures the pointer and swallows the click.
        className: "nopan",
        draggable: false,
        id: node.id,
        position: node.position,
        type: "note",
      })),
    [colouring, currentId, highlightSet, hoveredId, laidOut, open],
  );

  const edges: Edge[] = useMemo(
    () =>
      (graph?.edges ?? []).map((edge) => {
        const touching =
          hoveredId !== null && (edge.sourceId === hoveredId || edge.targetId === hoveredId);
        return {
          focusable: false,
          id: `${edge.sourceId}->${edge.targetId}`,
          source: edge.sourceId,
          style: highlightSet
            ? { opacity: touching ? 1 : 0.1, stroke: touching ? "hsl(var(--primary))" : undefined }
            : undefined,
          target: edge.targetId,
          type: "straight",
        };
      }),
    [graph, highlightSet, hoveredId],
  );

  const flatFolders = useMemo(() => {
    const out: FilterChip[] = [];
    const walk = (list: { id: string; name: string; children: unknown[] }[], prefix: string) => {
      for (const folder of list) {
        const label = prefix ? `${prefix} / ${folder.name}` : folder.name;
        out.push({ id: folder.id, label });
        walk(folder.children as typeof list, label);
      }
    };
    walk(folders.data ?? [], "");
    return out;
  }, [folders.data]);

  const sorted = [...laidOut].sort((a, b) => b.degree - a.degree || a.title.localeCompare(b.title));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Network aria-hidden="true" className="size-5" />
          {mode.kind === "local" ? "Local graph" : "Graph"}
        </h1>
        {mode.kind === "local" ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Depth</span>
            {[1, 2, 3].map((depth) => (
              <Link
                aria-current={mode.depth === depth ? "true" : undefined}
                className={cn(
                  "rounded px-2 py-0.5",
                  mode.depth === depth ? "bg-muted font-medium" : "underline",
                )}
                href={`/graph?note=${mode.noteId}&depth=${depth}`}
                key={depth}
              >
                {depth}
              </Link>
            ))}
            <Link className="underline" href="/graph">
              Whole graph
            </Link>
          </div>
        ) : null}
      </header>

      <ColourByControl onChange={setColourBy} value={colourBy} />

      {mode.kind === "global" ? (
        <div className="flex flex-col gap-2">
          <Chips
            active={tagId}
            chips={(tags.data ?? []).map((tag) => ({ id: tag.id, label: `#${tag.name}` }))}
            label="Tag"
            onChange={setTagId}
          />
          <Chips active={folderId} chips={flatFolders} label="Folder" onChange={setFolderId} />
        </div>
      ) : null}

      {query.isPending ? (
        <Skeleton aria-hidden="true" className="min-h-96 flex-1" />
      ) : query.isError ? (
        <p className="text-muted-foreground text-sm" role="status">
          The graph could not be loaded.
        </p>
      ) : laidOut.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Network aria-hidden="true" className="size-8" />
          <p className="text-sm">
            {tagId || folderId ? "No notes match this filter." : "Your graph is empty."}
          </p>
          <p className="text-xs">
            Create notes and link them with <kbd className="font-mono">[[Note title]]</kbd> — each
            link becomes an edge here.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-3">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <section
              aria-label="Graph canvas — use the notes list for keyboard access"
              className={styles.canvas}
              data-testid="graph-canvas"
            >
              <ReactFlow
                edges={edges}
                fitView
                maxZoom={2.5}
                minZoom={0.1}
                nodes={nodes}
                edgesFocusable={false}
                nodesConnectable={false}
                nodesFocusable={false}
                nodeTypes={nodeTypes}
                onNodeMouseEnter={(_event, node) => setHoveredId(node.id)}
                onNodeMouseLeave={() => setHoveredId(null)}
                onlyRenderVisibleElements={laidOut.length > 300}
                proOptions={{ hideAttribution: true }}
              >
                <Controls showInteractive={false} />
              </ReactFlow>
            </section>
            <GraphLegend
              activeId={colourBy === "folder" ? folderId : tagId}
              entries={colouring.legend}
              onSelect={
                mode.kind === "global"
                  ? (id) =>
                      // Pressing the active entry again clears its filter.
                      colourBy === "folder"
                        ? setFolderId((active) => (active === id ? undefined : id))
                        : setTagId((active) => (active === id ? undefined : id))
                  : undefined
              }
              showMultiHint={
                colourBy === "tag" && [...colouring.byNode.values()].some((n) => n.multi)
              }
            />
          </div>
          <nav aria-label="Notes in graph" className="w-56 shrink-0 overflow-y-auto">
            {graph && graph.edges.length === 0 ? (
              <p className="text-muted-foreground mb-2 text-xs">
                No links yet — type <kbd className="font-mono">[[</kbd> in a note to connect it.
              </p>
            ) : null}
            <ul className="flex flex-col">
              {sorted.map((node) => (
                <li key={node.id}>
                  <button
                    aria-current={node.id === currentId ? "page" : undefined}
                    className={cn(
                      "hover:bg-muted focus-visible:bg-muted flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm",
                      node.id === currentId && "font-semibold",
                      node.orphan && "text-muted-foreground",
                    )}
                    onBlur={() => setHoveredId(null)}
                    onClick={() => open(node.id)}
                    onFocus={() => setHoveredId(node.id)}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    type="button"
                  >
                    <span className="truncate">
                      {node.title || "Untitled"}
                      {colouring.byNode.get(node.id) ? (
                        <span className="sr-only">
                          , {colouring.byNode.get(node.id)!.groupLabel}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {node.degree} {node.degree === 1 ? "link" : "links"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
