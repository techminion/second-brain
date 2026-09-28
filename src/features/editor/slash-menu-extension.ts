import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";

// Slash menu trigger (EDIT-08). Like the `[[` suggestion (wiki-link-extension),
// this module only detects and reports; the host renders the menu and runs the
// chosen command. It triggers on `/` at the very start of a paragraph — never
// mid-sentence (so `and/or` and URLs are left alone) and never inside code.

export interface SlashTrigger {
  /** Position of the `/`. */
  from: number;
  /** Cursor position (end of the typed query). */
  to: number;
  query: string;
  left: number;
  bottom: number;
}

export interface SlashMenuOptions {
  onTrigger: (trigger: SlashTrigger | null) => void;
  /** Return true when the open menu consumed the key. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const slashMenuPluginKey = new PluginKey("slashMenu");

const triggerPattern = /^\/([\p{L}\p{N} ]{0,24})$/u;

export function findSlashTrigger(view: EditorView): SlashTrigger | null {
  const { state } = view;
  const { $from, empty } = state.selection;

  if (!empty || !view.hasFocus() || $from.parent.type.name !== "paragraph") {
    return null;
  }

  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const match = triggerPattern.exec(before);
  if (!match) {
    return null;
  }

  const from = $from.pos - before.length;
  let coords = { bottom: 0, left: 0 };
  try {
    coords = view.coordsAtPos(from);
  } catch {
    // No layout (e.g. jsdom): place at the origin.
  }
  return { bottom: coords.bottom, from, left: coords.left, query: match[1], to: $from.pos };
}

export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: "slashMenu",

  addOptions() {
    return { onKeyDown: () => false, onTrigger: () => undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    let last: string | null = null;

    const report = (view: EditorView) => {
      const trigger = findSlashTrigger(view);
      const key = trigger ? `${trigger.from}:${trigger.query}` : null;
      if (key !== last) {
        last = key;
        options.onTrigger(trigger);
      }
    };

    return [
      new Plugin({
        key: slashMenuPluginKey,
        props: {
          handleDOMEvents: {
            blur() {
              last = null;
              options.onTrigger(null);
              return false;
            },
          },
          handleKeyDown(_view, event) {
            return last !== null && options.onKeyDown(event);
          },
        },
        view() {
          return { update: report };
        },
      }),
    ];
  },
});
