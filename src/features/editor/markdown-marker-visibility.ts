import type { MarkType } from "@tiptap/pm/model";
import { type EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension, getMarkRange } from "@tiptap/react";

type MarkdownMarkerName = "bold" | "code" | "heading" | "italic";
type InlineMarkerName = Exclude<MarkdownMarkerName, "heading">;

interface InlineMarkerDefinition {
  closeSide: number;
  marker: string;
  name: InlineMarkerName;
  openSide: number;
}

const inlineMarkers: readonly InlineMarkerDefinition[] = [
  { closeSide: 30, marker: "**", name: "bold", openSide: -30 },
  { closeSide: 20, marker: "*", name: "italic", openSide: -20 },
  { closeSide: 10, marker: "`", name: "code", openSide: -10 },
];

interface MarkdownMarkerVisibilityState {
  focused: boolean;
}

const markdownMarkerVisibilityKey = new PluginKey<MarkdownMarkerVisibilityState>(
  "markdownMarkerVisibility",
);

function markerWidget(
  position: number,
  definition: { marker: string; name: MarkdownMarkerName },
  edge: "close" | "open",
  side: number,
): Decoration {
  return Decoration.widget(
    position,
    () => {
      const marker = document.createElement("span");
      marker.dataset.markdownMarker = definition.name;
      marker.dataset.markdownMarkerEdge = edge;
      marker.setAttribute("aria-hidden", "true");
      marker.contentEditable = "false";
      marker.textContent = definition.marker;
      return marker;
    },
    {
      ignoreSelection: true,
      key: `${definition.name}-${edge}-${position}`,
      side,
    },
  );
}

function activeMarkRange(state: EditorState, markType: MarkType) {
  return getMarkRange(state.selection.$from, markType);
}

function headingMarker(state: EditorState): Decoration | null {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== "heading") {
      continue;
    }

    const level = typeof node.attrs.level === "number" ? node.attrs.level : 1;
    const contentStart = $from.before(depth) + 1;
    return markerWidget(
      contentStart,
      { marker: `${"#".repeat(level)} `, name: "heading" },
      "open",
      -40,
    );
  }

  return null;
}

function markerDecorations(state: EditorState): DecorationSet {
  const decorations: Decoration[] = [];
  const heading = headingMarker(state);

  if (heading) {
    decorations.push(heading);
  }

  for (const definition of inlineMarkers) {
    const markType = state.schema.marks[definition.name];
    if (!markType) {
      continue;
    }

    const range = activeMarkRange(state, markType);
    if (!range) {
      continue;
    }

    decorations.push(
      markerWidget(range.from, definition, "open", definition.openSide),
      markerWidget(range.to, definition, "close", definition.closeSide),
    );
  }

  return DecorationSet.create(state.doc, decorations);
}

/**
 * Reveals ephemeral Markdown markers around the block/mark containing the
 * selection while the editor is focused. Decorations never enter the
 * ProseMirror document or persisted Markdown.
 */
export const MarkdownMarkerVisibility = Extension.create({
  name: "markdownMarkerVisibility",

  addProseMirrorPlugins() {
    return [
      new Plugin<MarkdownMarkerVisibilityState>({
        key: markdownMarkerVisibilityKey,
        state: {
          init: () => ({ focused: false }),
          apply: (transaction, previous) => {
            const focused = transaction.getMeta(markdownMarkerVisibilityKey);
            return typeof focused === "boolean" ? { focused } : previous;
          },
        },
        props: {
          decorations: (state) =>
            markdownMarkerVisibilityKey.getState(state)?.focused
              ? markerDecorations(state)
              : DecorationSet.empty,
          handleDOMEvents: {
            blur: (view) => {
              view.dispatch(view.state.tr.setMeta(markdownMarkerVisibilityKey, false));
              return false;
            },
            focus: (view) => {
              view.dispatch(view.state.tr.setMeta(markdownMarkerVisibilityKey, true));
              return false;
            },
          },
        },
      }),
    ];
  },
});
