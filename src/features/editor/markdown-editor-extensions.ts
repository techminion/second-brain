import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "@tiptap/markdown";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

import { MarkdownMarkerVisibility } from "./markdown-marker-visibility";

// The checkbox announces its own checked state, so the label carries only the
// task text. (Tiptap computes the first label before it sets `checked`, so the
// state argument would be stale on initial render anyway.)
function taskCheckboxLabel(node: ProseMirrorNode): string {
  return `Task: ${node.textContent.trim() || "empty task"}`;
}

// Underline is disabled: it has no standard markdown form (it would serialize
// as non-standard `++text++`), and 10_DESIGN §5 scopes formatting to
// bold/italic/code/link. Image is added so `![alt](url)` survives the
// FR-NOTE-2 round-trip instead of collapsing to its alt text. TaskList and
// TaskItem (EDIT-05) hold GFM `- [ ]` / `- [x]` checkboxes; nesting is on so
// indented sub-tasks survive, and each checkbox is labelled with its task
// text so a screen reader announces more than "checkbox".
export const markdownEditorExtensions = [
  StarterKit.configure({ underline: false }),
  Image,
  TaskList,
  TaskItem.configure({ nested: true, a11y: { checkboxLabel: taskCheckboxLabel } }),
  Markdown,
  MarkdownMarkerVisibility,
];
