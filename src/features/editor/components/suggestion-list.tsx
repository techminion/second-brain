import { type ReactNode, useEffect, useRef } from "react";

import styles from "./markdown-editor.module.css";

interface SuggestionListProps<T> {
  id: string;
  label: string;
  items: readonly T[];
  activeIndex: number;
  position: { left: number; bottom: number };
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onPick: (item: T) => void;
}

/**
 * The listbox half of an editor combobox (`[[` link suggestions, the slash
 * menu). Focus never leaves the editing surface: the host keeps
 * `aria-activedescendant` pointed at `${id}-${activeIndex}` and handles the
 * keys, and a pointer pick uses `mousedown` + `preventDefault` so the editor
 * keeps its selection.
 */
export function SuggestionList<T>({
  activeIndex,
  getKey,
  id,
  items,
  label,
  onPick,
  position,
  renderItem,
}: Readonly<SuggestionListProps<T>>) {
  const listRef = useRef<HTMLUListElement>(null);

  // Keyboard navigation happens in the editor (aria-activedescendant), so the
  // list must scroll the active option into view itself.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[id="${id}-${activeIndex}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, id]);

  return (
    // A focusable scroll region (axe scrollable-region-focusable). It never
    // becomes a stray tab stop: while the list is open the editor consumes Tab
    // to pick an option, and a pointer press never moves focus off the editor.
    <ul
      aria-label={label}
      className={styles.suggestions}
      id={id}
      onMouseDown={(event) => event.preventDefault()}
      ref={listRef}
      role="listbox"
      style={{ left: position.left, top: position.bottom + 4 }}
      tabIndex={0}
    >
      {items.map((item, index) => (
        <li
          aria-selected={index === activeIndex}
          className={styles.suggestion}
          data-active={index === activeIndex}
          id={`${id}-${index}`}
          key={getKey(item)}
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(item);
          }}
          role="option"
        >
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Shared listbox keys: arrows move (wrapping), Enter/Tab pick, Escape
 * dismisses. Returns true when the key was consumed.
 */
export function handleSuggestionKey(
  event: KeyboardEvent,
  count: number,
  handlers: { move: (delta: 1 | -1) => void; pick: () => void; dismiss: () => void },
): boolean {
  if (count === 0) {
    return false;
  }
  switch (event.key) {
    case "ArrowDown":
      handlers.move(1);
      return true;
    case "ArrowUp":
      handlers.move(-1);
      return true;
    case "Enter":
    case "Tab":
      handlers.pick();
      return true;
    case "Escape":
      handlers.dismiss();
      return true;
    default:
      return false;
  }
}
