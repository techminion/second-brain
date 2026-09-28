import { GraphView } from "@/features/graph/components/graph-view";

export const metadata = { title: "Graph" };

interface GraphPageProps {
  searchParams: Promise<{ note?: string; depth?: string }>;
}

/** `/graph` (global) or `/graph?note=<id>&depth=1..3` (local, FR-GRAPH-4). */
export default async function GraphPage({ searchParams }: GraphPageProps) {
  const { depth, note } = await searchParams;
  const parsedDepth = Math.min(Math.max(Number(depth ?? 1) || 1, 1), 3);

  return (
    <GraphView
      mode={note ? { depth: parsedDepth, kind: "local", noteId: note } : { kind: "global" }}
    />
  );
}
