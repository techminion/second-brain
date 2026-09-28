"use client";

import { useRouter } from "next/navigation";

import { useShortcut } from "../shortcuts/shortcut-manager";
import { useShellPanels } from "./shell-panels-context";

/**
 * Binds the 10_DESIGN §8 shell shortcuts: ⌘\ sidebar, ⌘E context panel, and
 * ⌘D today's daily note (DAILY-03 — a route hop, so the shell needs no
 * notes-feature import). ⌘D is allowed from plain inputs but not the editor.
 */
export function ShellShortcuts() {
  const { toggleLeft, toggleRight } = useShellPanels();
  const router = useRouter();

  useShortcut({ key: "\\" }, toggleLeft);
  useShortcut({ key: "e" }, toggleRight);
  useShortcut({ inputPolicy: "block-editable", key: "d" }, () => router.push("/daily"));

  return null;
}
