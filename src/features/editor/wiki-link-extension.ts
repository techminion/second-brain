import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { type EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";

// Wiki links in the editor (LINK-05/06/07/09, ADR-32). `[[Title]]` stays plain
// text in the document — so markdown round-trips untouched — and is *rendered*
// as a link through decorations. The host supplies resolution, navigation and
// suggestions; this module knows nothing about notes.

export interface WikiLinkSuggestion {
  /** Document position just after `[[`. */
  from: number;
  /** Cursor position (end of the typed query). */
  to: number;
  query: string;
  /** Viewport coordinates for positioning the popup. */
  left: number;
  bottom: number;
}

export interface WikiLinkOptions {
  isResolved: (title: string) => boolean;
  open: (title: string) => void;
  onSuggest: (suggestion: WikiLinkSuggestion | null) => void;
  /** Return true when the open suggestion popup consumed the key. */
  onSuggestKeyDown: (event: KeyboardEvent) => boolean;
}

interface WikiLinkState {
  decorations: DecorationSet;
  focused: boolean;
}

export const wikiLinkPluginKey = new PluginKey<WikiLinkState>("wikiLinks");
/** Transaction meta that forces decorations to recompute (resolution changed). */
export const wikiLinkRefreshMeta = "wikiLinksRefresh";
/** Transaction meta carrying the editor's focus state (brackets hide on blur). */
const wikiLinkFocusMeta = "wikiLinksFocus";

const linkPattern = /\[\[([^[\]\n]+)\]\]/g;
const openQueryPattern = /\[\[([^[\]\n]*)$/;

interface LinkRange {
  from: number;
  to: number;
  title: string;
}

function isCodeContext(node: ProseMirrorNode, parent: ProseMirrorNode | null): boolean {
  return parent?.type.spec.code === true || node.marks.some((mark) => mark.type.spec.code === true);
}

export function findLinkRanges(doc: ProseMirrorNode): LinkRange[] {
  const ranges: LinkRange[] = [];

  doc.descendants((node, position, parent) => {
    if (!node.isText || !node.text || isCodeContext(node, parent)) {
      return;
    }

    for (const match of node.text.matchAll(linkPattern)) {
      const title = match[1].trim();
      if (title && match.index !== undefined) {
        ranges.push({
          from: position + match.index,
          title,
          to: position + match.index + match[0].length,
        });
      }
    }
  });

  return ranges;
}

/**
 * Link decorations, plus bracket decorations that hide `[[` / `]]` (UX-03,
 * Obsidian's live preview) — except on the link holding the cursor, so the
 * syntax is visible exactly where the user is editing it. `cursor` is null
 * while the editor is blurred: every link then reads as plain link text.
 */
function buildDecorations(
  doc: ProseMirrorNode,
  options: WikiLinkOptions,
  cursor: number | null,
): DecorationSet {
  return DecorationSet.create(
    doc,
    findLinkRanges(doc).flatMap(({ from, title, to }) => {
      const resolved = options.isResolved(title);
      const link = Decoration.inline(from, to, {
        "data-wiki-link": resolved ? "resolved" : "unresolved",
        "data-wiki-title": title,
        title: resolved ? `Open “${title}”` : `Create “${title}”`,
      });
      if (cursor !== null && cursor >= from && cursor <= to) {
        return [link];
      }
      return [
        link,
        Decoration.inline(from, from + 2, { "data-wiki-bracket": "open" }),
        Decoration.inline(to - 2, to, { "data-wiki-bracket": "close" }),
      ];
    }),
  );
}

function cursorOf(state: EditorState, focused: boolean): number | null {
  return focused && state.selection.empty ? state.selection.head : null;
}

function linkAtSelection(state: EditorState): LinkRange | undefined {
  const { from } = state.selection;
  return findLinkRanges(state.doc).find((range) => from >= range.from && from <= range.to);
}

function currentSuggestion(view: EditorView): WikiLinkSuggestion | null {
  const { state } = view;
  const { $from, empty } = state.selection;

  if (!empty || !view.hasFocus() || $from.parent.type.spec.code) {
    return null;
  }

  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const match = openQueryPattern.exec(before);
  if (!match) {
    return null;
  }

  const from = $from.pos - match[1].length;
  let coords = { bottom: 0, left: 0 };
  try {
    coords = view.coordsAtPos(from - 2);
  } catch {
    // No layout (e.g. a detached or non-rendered view): place at the origin.
  }
  return { bottom: coords.bottom, from, left: coords.left, query: match[1], to: $from.pos };
}

export const WikiLinks = Extension.create<WikiLinkOptions>({
  name: "wikiLinks",

  addOptions() {
    return {
      isResolved: () => true,
      onSuggest: () => undefined,
      onSuggestKeyDown: () => false,
      open: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    let lastSuggestion: string | null = null;

    const report = (view: EditorView) => {
      const suggestion = currentSuggestion(view);
      const key = suggestion ? `${suggestion.from}:${suggestion.query}` : null;
      if (key !== lastSuggestion) {
        lastSuggestion = key;
        options.onSuggest(suggestion);
      }
    };

    return [
      new Plugin<WikiLinkState>({
        key: wikiLinkPluginKey,
        props: {
          decorations(state) {
            return wikiLinkPluginKey.getState(state)?.decorations;
          },
          handleDOMEvents: {
            click(_view, event) {
              const target = event.target instanceof Element ? event.target : null;
              const link = target?.closest<HTMLElement>("[data-wiki-title]");
              if (!link?.dataset.wikiTitle || event.button !== 0) {
                return false;
              }
              event.preventDefault();
              options.open(link.dataset.wikiTitle);
              return true;
            },
            blur(view) {
              lastSuggestion = null;
              options.onSuggest(null);
              view.dispatch(view.state.tr.setMeta(wikiLinkFocusMeta, false));
              return false;
            },
            focus(view) {
              view.dispatch(view.state.tr.setMeta(wikiLinkFocusMeta, true));
              report(view);
              return false;
            },
          },
          handleKeyDown(view, event) {
            if (lastSuggestion !== null && options.onSuggestKeyDown(event)) {
              return true;
            }

            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              const link = linkAtSelection(view.state);
              if (link) {
                options.open(link.title);
                return true;
              }
            }

            return false;
          },
        },
        state: {
          apply(transaction, value, _previous, next) {
            const focusMeta: unknown = transaction.getMeta(wikiLinkFocusMeta);
            const focused = typeof focusMeta === "boolean" ? focusMeta : value.focused;
            if (
              transaction.docChanged ||
              transaction.selectionSet ||
              focused !== value.focused ||
              transaction.getMeta(wikiLinkRefreshMeta)
            ) {
              return {
                decorations: buildDecorations(next.doc, options, cursorOf(next, focused)),
                focused,
              };
            }
            return value;
          },
          init(_config, state) {
            return { decorations: buildDecorations(state.doc, options, null), focused: false };
          },
        },
        view() {
          return {
            update(view) {
              report(view);
            },
          };
        },
      }),
    ];
  },
});
