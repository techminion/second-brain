import type { Editor, Range } from "@tiptap/core";

/**
 * Block-insert commands for the slash menu (EDIT-08, 10_DESIGN §5). Each one
 * first deletes the typed `/query`, then converts or inserts the block, so the
 * result is exactly what typing the markdown shortcut would have produced.
 * Images wait for attachments (ATT) — inserting one needs an upload.
 */
export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  keywords: readonly string[];
  run: (editor: Editor, range: Range) => void;
}

const start = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range);

export const slashCommands: readonly SlashCommand[] = [
  {
    description: "Large section heading",
    id: "heading-1",
    keywords: ["h1", "title"],
    label: "Heading 1",
    run: (editor, range) => start(editor, range).setNode("heading", { level: 1 }).run(),
  },
  {
    description: "Medium section heading",
    id: "heading-2",
    keywords: ["h2", "subtitle"],
    label: "Heading 2",
    run: (editor, range) => start(editor, range).setNode("heading", { level: 2 }).run(),
  },
  {
    description: "Small section heading",
    id: "heading-3",
    keywords: ["h3"],
    label: "Heading 3",
    run: (editor, range) => start(editor, range).setNode("heading", { level: 3 }).run(),
  },
  {
    description: "Simple bulleted list",
    id: "bullet-list",
    keywords: ["ul", "unordered", "bullets"],
    label: "Bulleted list",
    run: (editor, range) => start(editor, range).toggleBulletList().run(),
  },
  {
    description: "List with numbering",
    id: "ordered-list",
    keywords: ["ol", "ordered", "numbers"],
    label: "Numbered list",
    run: (editor, range) => start(editor, range).toggleOrderedList().run(),
  },
  {
    description: "Checklist of to-dos",
    id: "task-list",
    keywords: ["todo", "checkbox", "checklist"],
    label: "Task list",
    run: (editor, range) => start(editor, range).toggleTaskList().run(),
  },
  {
    description: "Code with syntax highlighting",
    id: "code-block",
    keywords: ["code", "fence", "snippet", "pre"],
    label: "Code block",
    run: (editor, range) => start(editor, range).setCodeBlock().run(),
  },
  {
    description: "Quoted passage",
    id: "blockquote",
    keywords: ["quote", "citation"],
    label: "Quote",
    run: (editor, range) => start(editor, range).setBlockquote().run(),
  },
  {
    description: "Table with a header row",
    id: "table",
    keywords: ["grid", "columns", "rows"],
    label: "Table",
    run: (editor, range) =>
      start(editor, range).insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run(),
  },
  {
    description: "Horizontal rule between sections",
    id: "divider",
    keywords: ["hr", "rule", "separator", "line"],
    label: "Divider",
    run: (editor, range) => start(editor, range).setHorizontalRule().run(),
  },
];

/**
 * Commands matching a slash query, best first: label prefix, then keyword
 * prefix, then label substring. Case-insensitive; an empty query lists all.
 */
export function filterSlashCommands(query: string): SlashCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...slashCommands];
  }

  const rank = (command: SlashCommand): number => {
    const label = command.label.toLowerCase();
    if (label.startsWith(needle) || label.split(" ").some((word) => word.startsWith(needle))) {
      return 0;
    }
    if (command.keywords.some((keyword) => keyword.startsWith(needle))) {
      return 1;
    }
    return label.includes(needle) ? 2 : -1;
  };

  return slashCommands
    .map((command) => ({ command, score: rank(command) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => a.score - b.score)
    .map(({ command }) => command);
}
