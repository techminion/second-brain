import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type ShortcutBinding, ShortcutProvider, useShortcut } from "./shortcut-manager";

function Probe({ binding, onFire }: Readonly<{ binding: ShortcutBinding; onFire: () => void }>) {
  useShortcut(binding, onFire);
  return (
    <div>
      <input aria-label="text field" />
      <div aria-label="editor" contentEditable role="textbox" tabIndex={0} />
    </div>
  );
}

function renderShortcut(binding: ShortcutBinding) {
  const onFire = vi.fn();
  const view = render(
    <ShortcutProvider>
      <Probe binding={binding} onFire={onFire} />
    </ShortcutProvider>,
  );
  return { onFire, view };
}

describe("useShortcut", () => {
  it("fires on ⌘+key and on Ctrl+key", () => {
    const { onFire } = renderShortcut({ key: "e" });

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    fireEvent.keyDown(document, { ctrlKey: true, key: "e" });

    expect(onFire).toHaveBeenCalledTimes(2);
  });

  it("does not fire without the ⌘/Ctrl modifier", () => {
    const { onFire } = renderShortcut({ key: "e" });

    fireEvent.keyDown(document, { key: "e" });

    expect(onFire).not.toHaveBeenCalled();
  });

  it("matches case-insensitively so Caps Lock cannot disable a shortcut", () => {
    const { onFire } = renderShortcut({ key: "k" });

    fireEvent.keyDown(document, { key: "K", metaKey: true });

    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it("requires shift to match exactly, distinguishing ⌘F from ⇧⌘F", () => {
    const { onFire } = renderShortcut({ key: "f", shift: true });

    fireEvent.keyDown(document, { key: "f", metaKey: true });
    expect(onFire).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "F", metaKey: true, shiftKey: true });
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it("suppresses shortcuts in text inputs under the default policy", () => {
    const { onFire } = renderShortcut({ key: "e" });

    fireEvent.keyDown(screen.getByLabelText("text field"), { key: "e", metaKey: true });

    expect(onFire).not.toHaveBeenCalled();
  });

  it("suppresses shortcuts in contenteditable regions under the default policy", () => {
    const { onFire } = renderShortcut({ key: "e" });

    fireEvent.keyDown(screen.getByLabelText("editor"), { key: "e", metaKey: true });

    expect(onFire).not.toHaveBeenCalled();
  });

  it("block-editable fires in text inputs but not in contenteditable", () => {
    const { onFire } = renderShortcut({ inputPolicy: "block-editable", key: "k" });

    fireEvent.keyDown(screen.getByLabelText("text field"), { key: "k", metaKey: true });
    expect(onFire).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByLabelText("editor"), { key: "k", metaKey: true });
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it("allow fires everywhere", () => {
    const { onFire } = renderShortcut({ inputPolicy: "allow", key: "e" });

    fireEvent.keyDown(screen.getByLabelText("text field"), { key: "e", metaKey: true });
    fireEvent.keyDown(screen.getByLabelText("editor"), { key: "e", metaKey: true });

    expect(onFire).toHaveBeenCalledTimes(2);
  });

  it("prevents the browser default on a match", () => {
    renderShortcut({ key: "e" });

    const event = new KeyboardEvent("keydown", {
      cancelable: true,
      key: "e",
      metaKey: true,
    });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("stops firing after the registering component unmounts", () => {
    const { onFire, view } = renderShortcut({ key: "e" });

    view.unmount();
    fireEvent.keyDown(document, { key: "e", metaKey: true });

    expect(onFire).not.toHaveBeenCalled();
  });

  it("matches an alt+code binding on macOS, where ⌥ changes event.key (UX-07)", () => {
    const { onFire } = renderShortcut({ alt: true, code: "KeyN", key: "n" });

    fireEvent.keyDown(document, { altKey: true, code: "KeyN", key: "˜", metaKey: true });

    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it("matches an alt+code binding on Ctrl+Alt+N", () => {
    const { onFire } = renderShortcut({ alt: true, code: "KeyN", key: "n" });

    fireEvent.keyDown(document, { altKey: true, code: "KeyN", ctrlKey: true, key: "n" });

    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it("does not fire an alt binding on Ctrl+N or Meta+N, leaving the browser default alone", () => {
    const { onFire } = renderShortcut({ alt: true, code: "KeyN", key: "n" });

    const ctrlN = new KeyboardEvent("keydown", {
      cancelable: true,
      code: "KeyN",
      ctrlKey: true,
      key: "n",
    });
    document.dispatchEvent(ctrlN);
    fireEvent.keyDown(document, { code: "KeyN", key: "n", metaKey: true });

    expect(onFire).not.toHaveBeenCalled();
    expect(ctrlN.defaultPrevented).toBe(false);
  });

  it("does not fire an alt binding for AltGr, so AltGr+N still types", () => {
    const { onFire } = renderShortcut({ alt: true, code: "KeyN", key: "n" });

    const event = new KeyboardEvent("keydown", {
      altKey: true,
      cancelable: true,
      code: "KeyN",
      ctrlKey: true,
      key: "ń",
    });
    Object.defineProperty(event, "getModifierState", {
      value: (key: string) => key === "AltGraph",
    });
    document.dispatchEvent(event);

    expect(onFire).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("skips Ctrl+Alt that typed another character when AltGraph is not reported", () => {
    const { onFire } = renderShortcut({ alt: true, code: "KeyN", key: "n" });

    const event = new KeyboardEvent("keydown", {
      altKey: true,
      cancelable: true,
      code: "KeyN",
      ctrlKey: true,
      key: "ń",
    });
    document.dispatchEvent(event);

    expect(onFire).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("still fires a genuine Ctrl+Alt+N (key n or N) under the fallback", () => {
    const { onFire } = renderShortcut({ alt: true, code: "KeyN", key: "n" });

    fireEvent.keyDown(document, { altKey: true, code: "KeyN", ctrlKey: true, key: "n" });
    fireEvent.keyDown(document, { altKey: true, code: "KeyN", ctrlKey: true, key: "N" });

    expect(onFire).toHaveBeenCalledTimes(2);
  });

  it("does not apply the Ctrl+Alt fallback to ⌥⌘N, whose key is a dead-key character", () => {
    const { onFire } = renderShortcut({ alt: true, code: "KeyN", key: "n" });

    fireEvent.keyDown(document, { altKey: true, code: "KeyN", key: "˜", metaKey: true });
    fireEvent.keyDown(document, { altKey: true, code: "KeyN", ctrlKey: true, key: "Dead" });

    expect(onFire).toHaveBeenCalledTimes(2);
  });

  it("treats alt as don't-care for key bindings that do not set it", () => {
    const { onFire } = renderShortcut({ key: "e" });

    fireEvent.keyDown(document, { altKey: true, key: "e", metaKey: true });

    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it("throws without a provider", () => {
    expect(() => render(<Probe binding={{ key: "e" }} onFire={vi.fn()} />)).toThrow(
      "useShortcut requires a ShortcutProvider ancestor",
    );
  });
});
