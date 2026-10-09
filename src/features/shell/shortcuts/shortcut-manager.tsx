"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

/**
 * Where a shortcut is allowed to fire when a form control or editable region
 * has focus (10_DESIGN §8 input-focus guards):
 * - "block-all-inputs" (default): suppressed in text inputs, textareas,
 *   selects, and contenteditable regions.
 * - "block-editable": suppressed only inside contenteditable regions — used
 *   by ⌘K, which must open from ordinary form fields but must not hijack the
 *   rich-text editor's own ⌘K binding.
 * - "allow": never suppressed.
 */
export type ShortcutInputPolicy = "allow" | "block-all-inputs" | "block-editable";

export interface ShortcutBinding {
  /** Normalized lowercase key, compared case-insensitively (Caps Lock safe). */
  key: string;
  /** Exact-match shift requirement — distinguishes ⌘F from ⇧⌘F. Default false. */
  shift?: boolean;
  /**
   * When `true`, the binding requires ⌥/Alt (and never fires for AltGr, so
   * AltGr+key still types its character on layouts such as Polish). When
   * unset, Alt is "don't care", so ⌘-only bindings behave as before.
   */
  alt?: boolean;
  /**
   * Physical key (`KeyboardEvent.code`, e.g. "KeyN"). When set it is matched
   * instead of `key` — required for ⌥ bindings, because ⌥ turns `event.key`
   * into a different (often dead-key) character on macOS.
   */
  code?: string;
  inputPolicy?: ShortcutInputPolicy;
}

type ShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutRegistration {
  binding: ShortcutBinding;
  handler: ShortcutHandler;
}

interface ShortcutRegistry {
  register: (registration: ShortcutRegistration) => () => void;
}

const ShortcutContext = createContext<ShortcutRegistry | null>(null);

function isSuppressedByPolicy(policy: ShortcutInputPolicy, target: EventTarget | null): boolean {
  if (policy === "allow" || !(target instanceof Element)) {
    return false;
  }

  if (target.closest("[contenteditable]")) {
    return true;
  }

  if (policy === "block-editable") {
    return false;
  }

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

function matchesKey(binding: ShortcutBinding, event: KeyboardEvent): boolean {
  if (binding.code) {
    return event.code === binding.code;
  }
  return event.key.toLowerCase() === binding.key;
}

function matchesAlt(binding: ShortcutBinding, event: KeyboardEvent): boolean {
  if (binding.alt !== true) {
    return true;
  }
  if (!event.altKey) {
    return false;
  }
  if (typeof event.getModifierState === "function") {
    // AltGr (sent as Ctrl+Alt on Windows) types a character; leave it alone.
    return !event.getModifierState("AltGraph");
  }
  // Fallback only where AltGraph cannot be queried: if Ctrl+Alt (no ⌘)
  // produced a printable character other than the bound key, assume AltGr
  // typed it (e.g. "ń"). Not used otherwise, because it would also block a
  // genuine Ctrl+Alt+N on Cyrillic/Greek layouts, where `key` is "т"/"ν".
  if (event.ctrlKey && !event.metaKey && isPrintableCharacter(event.key)) {
    return event.key.toLowerCase() === binding.key;
  }
  return true;
}

function isPrintableCharacter(key: string): boolean {
  // Named keys ("Enter", "Dead", "Unidentified") are longer than one code point.
  return [...key].length === 1 && key.trim() !== "";
}

export function ShortcutProvider({ children }: Readonly<{ children: ReactNode }>) {
  const registrationsRef = useRef<Set<ShortcutRegistration>>(new Set());

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Every 10_DESIGN §8 shortcut is ⌘-based; ⌘ maps to Ctrl off macOS.
      if (!event.metaKey && !event.ctrlKey) {
        return;
      }

      for (const { binding, handler } of registrationsRef.current) {
        if (
          !matchesKey(binding, event) ||
          event.shiftKey !== (binding.shift ?? false) ||
          !matchesAlt(binding, event) ||
          isSuppressedByPolicy(binding.inputPolicy ?? "block-all-inputs", event.target)
        ) {
          continue;
        }

        event.preventDefault();
        handler(event);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const register = useCallback((registration: ShortcutRegistration) => {
    registrationsRef.current.add(registration);
    return () => {
      registrationsRef.current.delete(registration);
    };
  }, []);

  const registry = useMemo(() => ({ register }), [register]);

  return <ShortcutContext.Provider value={registry}>{children}</ShortcutContext.Provider>;
}

/** Register a global keyboard shortcut for the lifetime of the component. */
export function useShortcut(binding: ShortcutBinding, handler: ShortcutHandler): void {
  const registry = useContext(ShortcutContext);

  if (!registry) {
    throw new Error("useShortcut requires a ShortcutProvider ancestor");
  }

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registry.register({
      binding: {
        alt: binding.alt,
        code: binding.code,
        inputPolicy: binding.inputPolicy ?? "block-all-inputs",
        key: binding.key,
        shift: binding.shift ?? false,
      },
      handler: (event) => handlerRef.current(event),
    });
  }, [binding.alt, binding.code, binding.inputPolicy, binding.key, binding.shift, registry]);
}
