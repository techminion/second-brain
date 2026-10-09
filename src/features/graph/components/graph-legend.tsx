import { cn } from "@/shared/lib/utils";

import type { LegendEntry } from "../graph-colours";

interface GraphLegendProps {
  entries: LegendEntry[];
  /** Tag mode: explain the multi-tag ring. */
  showMultiHint?: boolean;
  /** The id of the folder/tag filter in effect, if any. */
  activeId?: string;
  /** Apply the matching filter; omitted in local mode, where there are no filters. */
  onSelect?: (id: string) => void;
}

/** CSS custom property value for a palette slot, or undefined for the neutral. */
export function graphColourVar(colour: number | null): string | undefined {
  return colour === null ? undefined : `var(--color-graph-${colour})`;
}

function Swatch({ colour, ring = false }: Readonly<{ colour: number | null; ring?: boolean }>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-muted-foreground inline-block size-3 shrink-0 rounded-full",
        ring && "ring-foreground ring-2 ring-offset-1",
      )}
      style={colour === null ? undefined : { background: graphColourVar(colour) }}
    />
  );
}

/**
 * The colour key for the graph (UX-11, ADR-42): swatch + name + count for
 * each group, so colour is never the only cue. A group entry applies the
 * matching folder/tag filter when `onSelect` is given.
 */
export function GraphLegend({
  activeId,
  entries,
  onSelect,
  showMultiHint = false,
}: Readonly<GraphLegendProps>) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Graph legend"
      className="bg-background/95 absolute bottom-2 left-2 z-10 max-h-48 w-52 overflow-y-auto rounded-md border p-2 text-xs shadow-sm"
    >
      <ul className="flex flex-col gap-0.5">
        {entries.map((entry) => {
          const content = (
            <>
              <Swatch colour={entry.colour} />
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              <span className="text-muted-foreground tabular-nums">{entry.count}</span>
            </>
          );
          const key = entry.id ?? `${entry.kind}`;

          return (
            <li key={key}>
              {entry.kind === "group" && entry.id && onSelect ? (
                <button
                  aria-label={`${entry.name}, ${entry.count} ${entry.count === 1 ? "note" : "notes"}: filter the graph`}
                  aria-pressed={activeId === entry.id}
                  className={cn(
                    "hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-2 rounded px-1.5 py-1 text-left outline-none focus-visible:ring-2",
                    activeId === entry.id && "bg-muted font-medium",
                  )}
                  onClick={() => onSelect(entry.id!)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-1.5 py-1">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {showMultiHint ? (
        <p className="text-muted-foreground mt-1 flex items-center gap-2 border-t px-1.5 pt-1.5">
          <Swatch colour={null} ring />
          Ring: more than one tag
        </p>
      ) : null}
    </section>
  );
}
