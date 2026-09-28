"use client";

import { useRouter } from "next/navigation";

import { useShortcut } from "../shortcuts/shortcut-manager";
import { useShellPanels } from "./shell-panels-context";

/**
 * Binds the 10_DESIGN §8 shell shortcuts: ⌘\ sidebar, ⌘E context panel,
 * ⌘D today's daily note (DAILY-03) and ⇧⌘G the graph (GRAPH-12). The last two
 * are route hops, so the shell needs no feature imports; both are allowed
 * from plain inputs but not inside the editor.
 */
export function ShellShortcuts() {
  const { toggleLeft, toggleRight } = useShellPanels();
  const router = useRouter();

  useShortcut({ key: "\\" }, toggleLeft);
  useShortcut({ key: "e" }, toggleRight);
  useShortcut({ inputPolicy: "block-editable", key: "d" }, () => router.push("/daily"));
  useShortcut({ inputPolicy: "block-editable", key: "g", shift: true }, () =>
    router.push("/graph"),
  );

  return null;
}
