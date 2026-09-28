import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "@tiptap/markdown";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

import { MarkdownMarkerVisibility } from "./markdown-marker-visibility";
import { isSafeImageSrc } from "./safe-image-src";

// EDIT-16 (09_SECURITY §9 T4): the stock Image node renders any `src` scheme.
// This keeps the attribute in the model (loss-free markdown) but only emits it
// to the DOM when it is an http(s) or root-relative URL.
const SafeImage = Image.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};

    return {
      ...parent,
      src: {
        default: null,
        renderHTML: (attributes: { src?: unknown }) =>
          isSafeImageSrc(attributes.src) ? { src: attributes.src } : {},
      },
    };
  },
});

// The checkbox announces its own checked state, so the label carries only the
// task text — from the item's own paragraph, since `textContent` would also
// concatenate every nested sub-task (adopted from PR #129). Tiptap computes
// the first label before it sets `checked`, so a state argument would be stale.
function taskCheckboxLabel(node: ProseMirrorNode): string {
  return `Task: ${node.firstChild?.textContent.trim() || "empty task"}`;
}

// Underline is disabled: it has no standard markdown form (it would serialize
// as non-standard `++text++`), and 10_DESIGN §5 scopes formatting to
// bold/italic/code/link. Image (as SafeImage, EDIT-16) is added so `![alt](url)` survives the
// FR-NOTE-2 round-trip instead of collapsing to its alt text. TaskList and
// TaskItem (EDIT-05) hold GFM `- [ ]` / `- [x]` checkboxes; nesting is on so
// indented sub-tasks survive, and each checkbox is labelled with its task
// text so a screen reader announces more than "checkbox".
export const markdownEditorExtensions = [
  StarterKit.configure({ underline: false }),
  SafeImage,
  TaskList,
  TaskItem.configure({
    a11y: { checkboxLabel: taskCheckboxLabel },
    // The live NodeView only emits configured attributes, so without this the
    // `li[data-type="taskItem"]` layout styles never match in the browser.
    HTMLAttributes: { "data-type": "taskItem" },
    nested: true,
  }),
  Markdown,
  MarkdownMarkerVisibility,
];
