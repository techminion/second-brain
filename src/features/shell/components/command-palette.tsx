"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/utils";

import { type Command, COMMANDS } from "../commands/command-registry";

function matchesQuery(command: Command, query: string): boolean {
  if (!query) return true;
  return command.label.toLowerCase().includes(query.toLowerCase());
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = COMMANDS.filter((cmd) => matchesQuery(cmd, query));

  const executeCommand = useCallback(
    (command: Command) => {
      if (command.disabled) return;
      setOpen(false);
      if (command.href) {
        router.push(command.href);
      }
    },
    [router],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        // Skip when focus is inside a rich-text area (e.g. editor with ⌘K = insert link).
        if (e.target instanceof Element && e.target.closest("[contenteditable]")) return;
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

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

  const activeId = filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined;

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-foreground/20 fixed inset-0 z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="bg-background fixed top-1/4 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border shadow-lg"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="border-b p-3">
            <input
              ref={inputRef}
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
