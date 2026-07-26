import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

import { MarkdownMarkerVisibility } from "./markdown-marker-visibility";

// Underline is disabled: it has no standard markdown form (it would serialize
// as non-standard `++text++`), and 10_DESIGN §5 scopes formatting to
// bold/italic/code/link. Image is added so `![alt](url)` survives the
// FR-NOTE-2 round-trip instead of collapsing to its alt text.
export const markdownEditorExtensions = [
  StarterKit.configure({ underline: false }),
  TaskList,
  TaskItem.configure({
    nested: true,
    // TaskItem's custom NodeView applies configured attributes directly; the
    // selector keeps rendered task layout consistent with static HTML output.
    HTMLAttributes: { "data-type": "taskItem" },
    // A parent task's `textContent` includes every nested child. Name the
    // checkbox from its own paragraph so assistive technology announces one
    // concise action instead of concatenating the whole subtree.
    a11y: {
      checkboxLabel: (node) =>
        `Task item checkbox for ${node.firstChild?.textContent || "empty task item"}`,
    },
  }),
  Image,
  Markdown,
  MarkdownMarkerVisibility,
];
