"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/shared/lib/utils";

import { type Command, COMMANDS } from "../commands/command-registry";
import { useShortcut } from "../shortcuts/shortcut-manager";
import styles from "./command-palette.module.css";
import { useShellPanels } from "./shell-panels-context";

function matchesQuery(command: Command, query: string): boolean {
  if (!query) return true;
  return command.label.toLowerCase().includes(query.toLowerCase());
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const { toggleLeft, toggleRight } = useShellPanels();

  const filtered = COMMANDS.filter((cmd) => matchesQuery(cmd, query));

  const executeCommand = useCallback(
    (command: Command) => {
      if (command.disabled) return;
      setOpen(false);
      if (command.href) {
        router.push(command.href);
      } else if (command.action === "toggle-sidebar") {
        toggleLeft();
      } else if (command.action === "toggle-right-panel") {
        toggleRight();
      }
    },
    [router, toggleLeft, toggleRight],
  );

  // ⌘K opens from anywhere except a rich-text editor, which binds ⌘K itself.
  useShortcut({ inputPolicy: "block-editable", key: "k" }, () => {
    setOpen((prev) => !prev);
  });

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const activeId = filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined;

  // Keep the active option visible while arrowing past the listbox fold.
  useEffect(() => {
    if (open && activeId) {
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeId, open]);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const activeCommand = filtered[activeIndex];
      if (activeCommand) executeCommand(activeCommand);
    }
  }

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn("bg-foreground/20 fixed inset-0 z-50", styles.overlay)} />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "bg-background fixed top-1/4 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border shadow-lg",
            styles.content,
          )}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="border-b p-3">
            <input
              aria-activedescendant={activeId}
              aria-controls="command-palette-list"
              aria-expanded={filtered.length > 0}
              aria-haspopup="listbox"
              aria-label="Search commands"
              autoFocus
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search commands…"
              role="combobox"
              value={query}
            />
          </div>
          {filtered.length > 0 ? (
            <ul
              aria-label="Commands"
              className="max-h-72 overflow-y-auto p-1"
              id="command-palette-list"
              role="listbox"
            >
              {filtered.map((cmd, index) => (
                <li
                  key={cmd.id}
                  aria-disabled={cmd.disabled ?? false}
                  aria-selected={index === activeIndex}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm",
                    index === activeIndex && !cmd.disabled && "bg-accent",
                    cmd.disabled && "cursor-default opacity-50",
                  )}
                  id={`cmd-${cmd.id}`}
                  onClick={() => executeCommand(cmd)}
                  role="option"
                >
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <span className="text-muted-foreground ml-auto text-xs">{cmd.shortcut}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground p-4 text-center text-sm">No commands found.</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
