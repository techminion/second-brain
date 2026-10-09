"use client";

import { useRegisterCommandHandler } from "@/features/shell/commands/command-handlers";
import { useShortcut } from "@/features/shell/shortcuts/shortcut-manager";

import { useCreateAndOpenNote } from "../hooks/use-create-and-open-note";

/**
 * Wires "New note" into the shell (UX-07): the palette command's handler and
 * the ⌥⌘N / Ctrl+Alt+N shortcut. ⌘N/Ctrl+N is reserved by browsers for a new
 * window and cannot be overridden by a page (ADR-41). Matched on the physical
 * key because ⌥ changes `event.key` on macOS. Fires from the editor and form
 * fields too; auto-repeat from a held key is ignored. Renders nothing; it is
 * mounted through the shell's `overlays` slot.
 */
export function NewNoteCommand() {
  const { createAndOpen } = useCreateAndOpenNote();

  useRegisterCommandHandler("new-note", createAndOpen);
  useShortcut({ alt: true, code: "KeyN", inputPolicy: "allow", key: "n" }, (event) => {
    if (!event.repeat) {
      createAndOpen();
    }
  });

  return null;
}
