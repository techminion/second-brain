interface Command {
  id: string;
  label: string;
  shortcut?: string;
  href?: string;
  disabled?: boolean;
}

// Static registry — SHELL-04 MVP. Feature tasks add commands as routes are built.
const COMMANDS: readonly Command[] = [
  { id: "new-note", label: "New note", shortcut: "⌘N", disabled: true },
  { id: "quick-open", label: "Quick-open note", shortcut: "⌘P", disabled: true },
  { id: "daily-note", label: "Today's daily note", shortcut: "⌘D", disabled: true },
  { id: "toggle-right-panel", label: "Toggle right panel", shortcut: "⌘E", disabled: true },
  { id: "toggle-sidebar", label: "Toggle sidebar", shortcut: "⌘\\", disabled: true },
  { id: "search-note", label: "Search in current note", shortcut: "⌘F", disabled: true },
  { id: "global-search", label: "Global search", shortcut: "⇧⌘F", disabled: true },
  { id: "graph-view", label: "Graph view", shortcut: "⇧⌘G", disabled: true },
  { id: "open-settings", label: "Open settings", href: "/settings" },
];

export type { Command };
export { COMMANDS };
