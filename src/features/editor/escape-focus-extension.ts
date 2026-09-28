import { Extension } from "@tiptap/core";

/**
 * Escape leaves the editor (EDIT-15, WCAG 2.1.2 No Keyboard Trap). Inside
 * lists and tables Tab indents or moves between cells, so Tab alone cannot
 * leave the document; Escape blurs it and the next Tab reaches the rest of the
 * page — the convention of CodeMirror and GitHub's editor. Lowest priority, so
 * an open `[[` or slash menu consumes Escape first to close itself.
 */
export const EscapeFocus = Extension.create({
  name: "escapeFocus",
  priority: 0,

  addKeyboardShortcuts() {
    return {
      Escape: ({ editor }) => {
        (editor.view.dom as HTMLElement).blur();
        return true;
      },
    };
  },
});
