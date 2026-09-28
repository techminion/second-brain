import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { renderTableToMarkdown, Table, TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

import { codeLowlight } from "./code-languages";
import { MarkdownMarkerVisibility } from "./markdown-marker-visibility";
import { MarkdownPaste } from "./markdown-paste-extension";
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

// EDIT-07: Tiptap's GFM table serializer has two defects this override fixes.
// A literal `|` inside a cell is written unescaped, which splits the cell on
// the next load (silent content loss, FR-NOTE-2); and the table is wrapped in
// newlines that open a stray blank line at the start of a document. Escaping
// is also correct inside code spans — GFM requires `\|` there within tables.
const escapeCellPipes = (markdown: string) => markdown.replaceAll("|", "\\|");

const MarkdownSafeTable = Table.extend({
  renderMarkdown: (node, helpers) =>
    renderTableToMarkdown(node, {
      ...helpers,
      renderChildren: (nodes, separator) =>
        escapeCellPipes(helpers.renderChildren(nodes, separator)),
    }).trim(),
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
// EDIT-07: blockquotes and horizontal rules come from StarterKit; GFM tables
// come from TableKit (header row + body cells, no column resizing — widths
// have no markdown form).
export const markdownEditorExtensions = [
  StarterKit.configure({ codeBlock: false, underline: false }),
  // EDIT-06: fences keep their info string (```ts) in the markdown; lowlight
  // highlighting is decoration-only and token-colored (markdown-editor.module.css).
  CodeBlockLowlight.configure({ defaultLanguage: null, lowlight: codeLowlight }),
  MarkdownSafeTable.configure({ resizable: false }),
  TableKit.configure({ table: false }),
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
  MarkdownPaste,
];
