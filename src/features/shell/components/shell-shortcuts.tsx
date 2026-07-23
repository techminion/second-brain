"use client";

import { useShortcut } from "../shortcuts/shortcut-manager";
import { useShellPanels } from "./shell-panels-context";

/** Binds the 10_DESIGN §8 panel shortcuts: ⌘\ sidebar, ⌘E context panel. */
export function ShellShortcuts() {
  const { toggleLeft, toggleRight } = useShellPanels();

  useShortcut({ key: "\\" }, toggleLeft);
  useShortcut({ key: "e" }, toggleRight);

  return null;
}
