import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { type EditorState, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";

// Find within the current note (EDIT-18, 10_DESIGN §8 ⌘F). The plugin owns
// the query, the matches and the current index, and paints them with
// decorations; the host renders the find bar and drives it through the
// commands below. Matching is case-insensitive over each textblock's text, so
// a match can span formatting (`**bo**ld` finds "bold") but never crosses
// from one block into the next.

export interface FindMatch {
  from: number;
  to: number;
}

export interface FindState {
  query: string;
  matches: FindMatch[];
  /** Index into `matches`, or -1 when there are none. */
  current: number;
}

const emptyState: FindState = { current: -1, matches: [], query: "" };

export const findInNotePluginKey = new PluginKey<FindState>("findInNote");

type FindMeta = { query: string } | { step: 1 | -1 } | { clear: true };

/**
 * Every case-insensitive occurrence of `query` in the document, in order.
 * Each leaf inline node (image, hard break) counts as one placeholder
 * character, so string offsets map one-to-one onto document positions.
 */
export function findMatches(doc: ProseMirrorNode, query: string): FindMatch[] {
  const needle = query.toLocaleLowerCase();
  if (!needle) {
    return [];
  }

  const matches: FindMatch[] = [];
  doc.descendants((node, position) => {
    if (!node.isTextblock) {
      return true;
    }
    const text = node.textBetween(0, node.content.size, undefined, "￼").toLocaleLowerCase();
    let index = text.indexOf(needle);
    while (index !== -1) {
      const from = position + 1 + index;
      matches.push({ from, to: from + needle.length });
      index = text.indexOf(needle, index + needle.length);
    }
    return false;
  });
  return matches;
}

function nearestMatch(matches: FindMatch[], state: EditorState): number {
  if (matches.length === 0) {
    return -1;
  }
  const anchor = state.selection.from;
  const after = matches.findIndex((match) => match.from >= anchor);
  return after === -1 ? 0 : after;
}

function decorate(doc: ProseMirrorNode, find: FindState): DecorationSet {
  return DecorationSet.create(
    doc,
    find.matches.map((match, index) =>
      Decoration.inline(match.from, match.to, {
        "data-find-match": index === find.current ? "current" : "match",
      }),
    ),
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findInNote: {
      /** Set (or replace) the query; the current match is the first at/after the cursor. */
      setFindQuery: (query: string) => ReturnType;
      /** Move to the next (1) or previous (-1) match, wrapping, and select it. */
      stepFindMatch: (step: 1 | -1) => ReturnType;
      /** Select the current match (e.g. when the find bar closes). */
      selectCurrentFindMatch: () => ReturnType;
      clearFind: () => ReturnType;
    };
  }
}

export const FindInNote = Extension.create({
  name: "findInNote",

  addCommands() {
    return {
      clearFind:
        () =>
        ({ dispatch, tr }) => {
          dispatch?.(tr.setMeta(findInNotePluginKey, { clear: true } satisfies FindMeta));
          return true;
        },
      selectCurrentFindMatch:
        () =>
        ({ dispatch, state, tr }) => {
          const find = findInNotePluginKey.getState(state);
          const match = find && find.current >= 0 ? find.matches[find.current] : undefined;
          if (!match) {
            return false;
          }
          dispatch?.(
            tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView(),
          );
          return true;
        },
      setFindQuery:
        (query) =>
        ({ dispatch, tr }) => {
          dispatch?.(tr.setMeta(findInNotePluginKey, { query } satisfies FindMeta));
          return true;
        },
      stepFindMatch:
        (step) =>
        ({ dispatch, state, tr }) => {
          const find = findInNotePluginKey.getState(state);
          if (!find || find.matches.length === 0) {
            return false;
          }
          const next = (find.current + step + find.matches.length) % find.matches.length;
          const match = find.matches[next];
          if (dispatch) {
            tr.setMeta(findInNotePluginKey, { step } satisfies FindMeta);
            tr.setSelection(TextSelection.create(tr.doc, match.from, match.to));
            dispatch(tr.scrollIntoView());
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findInNotePluginKey,
        props: {
          decorations(state) {
            const find = findInNotePluginKey.getState(state);
            return find && find.matches.length > 0 ? decorate(state.doc, find) : null;
          },
        },
        state: {
          apply(tr, previous, _oldState, newState): FindState {
            const meta = tr.getMeta(findInNotePluginKey) as FindMeta | undefined;
            if (meta && "clear" in meta) {
              return emptyState;
            }
            if (meta && "query" in meta) {
              const matches = findMatches(newState.doc, meta.query);
              return { current: nearestMatch(matches, newState), matches, query: meta.query };
            }
            if (meta && "step" in meta) {
              const count = previous.matches.length;
              return { ...previous, current: (previous.current + meta.step + count) % count };
            }
            if (tr.docChanged && previous.query) {
              const matches = findMatches(newState.doc, previous.query);
              const current =
                matches.length === 0
                  ? -1
                  : Math.min(Math.max(previous.current, 0), matches.length - 1);
              return { ...previous, current, matches };
            }
            return previous;
          },
          init: () => emptyState,
        },
      }),
    ];
  },
});
