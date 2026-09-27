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

export const wikiLinkPluginKey = new PluginKey<DecorationSet>("wikiLinks");
/** Transaction meta that forces decorations to recompute (resolution changed). */
export const wikiLinkRefreshMeta = "wikiLinksRefresh";

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

function buildDecorations(doc: ProseMirrorNode, options: WikiLinkOptions): DecorationSet {
  return DecorationSet.create(
    doc,
    findLinkRanges(doc).map(({ from, title, to }) => {
      const resolved = options.isResolved(title);
      return Decoration.inline(from, to, {
        "data-wiki-link": resolved ? "resolved" : "unresolved",
        "data-wiki-title": title,
        title: resolved ? `Open “${title}”` : `Create “${title}”`,
      });
    }),
  );
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
      new Plugin<DecorationSet>({
        key: wikiLinkPluginKey,
        props: {
          decorations(state) {
            return wikiLinkPluginKey.getState(state);
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
            blur() {
              lastSuggestion = null;
              options.onSuggest(null);
              return false;
            },
            focus(view) {
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
          apply(transaction, decorations, _previous, next) {
            if (transaction.docChanged || transaction.getMeta(wikiLinkRefreshMeta)) {
              return buildDecorations(next.doc, options);
            }
            return decorations.map(transaction.mapping, transaction.doc);
          },
          init(_config, state) {
            return buildDecorations(state.doc, options);
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
