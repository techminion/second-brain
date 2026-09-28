"use client";

import { useRouter } from "next/navigation";

import { useQuickOpenState } from "../overlays/quick-open-state";
import { useShortcut } from "../shortcuts/shortcut-manager";
import { useShellPanels } from "./shell-panels-context";

/**
 * Binds the 10_DESIGN §8 shell shortcuts: ⌘\ sidebar, ⌘E context panel,
 * ⌘D today's daily note (DAILY-03) and ⇧⌘G the graph (GRAPH-12). The last two
 * are route hops, so the shell needs no feature imports; both are allowed
 * from plain inputs but not inside the editor. ⌘P toggles quick-open
 * (SRCH-07) from anywhere, the editor included — it has no ⌘P of its own, and
 * this replaces the browser's print dialog as 10_DESIGN §8 intends.
 */
export function ShellShortcuts() {
  const { toggleLeft, toggleRight } = useShellPanels();
  const router = useRouter();
  const quickOpen = useQuickOpenState();

  useShortcut({ key: "\\" }, toggleLeft);
  useShortcut({ key: "e" }, toggleRight);
  useShortcut({ inputPolicy: "block-editable", key: "d" }, () => router.push("/daily"));
  useShortcut({ inputPolicy: "block-editable", key: "g", shift: true }, () =>
    router.push("/graph"),
  );
  useShortcut({ inputPolicy: "allow", key: "p" }, () => quickOpen.setOpen(!quickOpen.isOpen));
  // ⇧⌘F global search (FTS-06) from anywhere, the editor included — ⌘F
  // without shift stays find-in-note there.
  useShortcut({ inputPolicy: "allow", key: "f", shift: true }, () => router.push("/search"));

  return null;
}
