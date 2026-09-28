"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

import type { WikiLinkController } from "@/features/editor";
import { fetchLocalGraph } from "@/features/graph/graph-api";
import { fetchTitleSuggestions } from "@/features/search/search-api";
import { graphRootKey } from "@/shared/lib/query-keys";

import { createNoteRequest } from "../note-api";

/**
 * Wires the editor's wiki links to the knowledge graph (LINK-05..09):
 * resolution comes from the note's saved outgoing edges (its local graph,
 * refreshed on every save), clicks open the target or — for an unresolved
 * link — find an exact-title note or create it (FR-LINK-4), and `[[`
 * suggestions come from trigram title search (FR-LINK-3).
 */
export function useWikiLinkController(
  noteId: string,
  noteTitle: string,
  beforeNavigate: () => void,
): WikiLinkController {
  const router = useRouter();
  const graph = useQuery({
    queryFn: () => fetchLocalGraph(noteId),
    queryKey: [...graphRootKey, "local", noteId],
  });

  const resolved = useMemo(() => {
    const titleToId = new Map<string, string>();
    const nodes = new Map((graph.data?.nodes ?? []).map((node) => [node.id, node]));
    for (const edge of graph.data?.edges ?? []) {
      const target = nodes.get(edge.targetId);
      if (edge.sourceId === noteId && target) {
        titleToId.set(target.title.trim().toLowerCase(), target.id);
      }
    }
    return titleToId;
  }, [graph.data, noteId]);

  return useMemo<WikiLinkController>(
    () => ({
      isResolved: (title) => resolved.has(title.trim().toLowerCase()),
      open: (title) => {
        beforeNavigate();
        const known = resolved.get(title.trim().toLowerCase());
        if (known) {
          router.push(`/notes/${known}`);
          return;
        }
        void (async () => {
          try {
            const matches = await fetchTitleSuggestions(title, 5);
            const exact = matches.find(
              (match) => match.title.trim().toLowerCase() === title.trim().toLowerCase(),
            );
            const target = exact ?? (await createNoteRequest({ title: title.trim() }));
            router.push(`/notes/${target.id}`);
          } catch {
            toast.error(`Could not open “${title}”.`);
          }
        })();
      },
      resolutionKey: [...resolved.keys()].sort().join("\n"),
      suggest: async (query) => {
        if (!query.trim()) {
          return [];
        }
        const matches = await fetchTitleSuggestions(query, 8);
        const self = noteTitle.trim().toLowerCase();
        return matches
          .map((match) => match.title)
          .filter((title) => title.trim().toLowerCase() !== self);
      },
    }),
    [beforeNavigate, noteTitle, resolved, router],
  );
}
