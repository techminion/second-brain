"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/shared/lib/utils";

import { markdownEditorExtensions } from "../markdown-editor-extensions";
import { serializeEditorMarkdown } from "../markdown-round-trip";
import { wikiLinkRefreshMeta, WikiLinks, type WikiLinkSuggestion } from "../wiki-link-extension";
import styles from "./markdown-editor.module.css";

/**
 * Host-supplied wiki-link behavior (LINK-05..09). The editor renders links and
 * the `[[` popup; the host decides what resolves, where a link goes, and what
 * to suggest. `resolutionKey` changes whenever resolution may have changed.
 */
export interface WikiLinkController {
  isResolved: (title: string) => boolean;
  open: (title: string) => void;
  suggest: (query: string) => Promise<string[]>;
  resolutionKey: string;
}

export interface MarkdownEditorProps {
  value: string;
  wikiLinks?: WikiLinkController;
  onChange: (markdown: string) => void;
  ariaLabel?: string;
  className?: string;
  editable?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  ariaLabel = "Note body",
  className,
  editable = true,
  wikiLinks,
}: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const wikiLinksRef = useRef(wikiLinks);
  wikiLinksRef.current = wikiLinks;

  const listboxId = useId();
  const [suggestion, setSuggestion] = useState<WikiLinkSuggestion | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const popupOpen = suggestion !== null && dismissedAt !== suggestion.from && items.length > 0;
  const keyHandlerRef = useRef<(event: KeyboardEvent) => boolean>(() => false);

  const extensions = useMemo(
    () => [
      ...markdownEditorExtensions,
      WikiLinks.configure({
        isResolved: (title) => wikiLinksRef.current?.isResolved(title) ?? true,
        onSuggest: (next) => setSuggestion(wikiLinksRef.current ? next : null),
        onSuggestKeyDown: (event) => keyHandlerRef.current(event),
        open: (title) => wikiLinksRef.current?.open(title),
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: value,
    contentType: "markdown",
    editable,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        "aria-multiline": "true",
        class: styles.content,
        role: "textbox",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChangeRef.current(serializeEditorMarkdown(updatedEditor));
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(editable, false);
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...editor.options.editorProps.attributes,
          "aria-disabled": String(!editable),
          "aria-label": ariaLabel,
          "aria-multiline": "true",
          class: styles.content,
          role: "textbox",
        },
      },
    });
  }, [ariaLabel, editable, editor]);

  useEffect(() => {
    // Compare through the same serializer onChange emits, or a value that
    // contains a repaired wiki link would never match and setContent would
    // reset the cursor on every render.
    if (!editor || serializeEditorMarkdown(editor) === value) {
      return;
    }

    editor.commands.setContent(value, {
      contentType: "markdown",
      emitUpdate: false,
    });
  }, [editor, value]);

  // Resolution changed (e.g. the note saved and its links re-resolved).
  const resolutionKey = wikiLinks?.resolutionKey;
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr.setMeta(wikiLinkRefreshMeta, true));
    }
  }, [editor, resolutionKey]);

  // Fetch `[[` suggestions for the current query; stale responses are dropped.
  const query = suggestion?.query;
  useEffect(() => {
    if (query === undefined || !wikiLinksRef.current) {
      setItems([]);
      return;
    }
    let current = true;
    wikiLinksRef.current
      .suggest(query)
      .then((titles) => {
        if (current) {
          setItems(titles);
          setActiveIndex(0);
        }
      })
      .catch(() => {
        if (current) {
          setItems([]);
        }
      });
    return () => {
      current = false;
    };
  }, [query]);

  const insertSuggestion = useCallback(
    (title: string) => {
      if (!editor || !suggestion) {
        return;
      }
      const after = editor.state.doc.textBetween(
        suggestion.to,
        Math.min(suggestion.to + 2, editor.state.doc.content.size),
      );
      editor
        .chain()
        .focus()
        .insertContentAt({ from: suggestion.from, to: suggestion.to + (after === "]]" ? 2 : 0) }, [
          { text: `${title}]]`, type: "text" },
        ])
        .run();
      setSuggestion(null);
    },
    [editor, suggestion],
  );

  keyHandlerRef.current = (event) => {
    if (!popupOpen || !suggestion) {
      return false;
    }
    if (event.key === "ArrowDown") {
      setActiveIndex((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      setActiveIndex((index) => (index - 1 + items.length) % items.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      insertSuggestion(items[activeIndex] ?? items[0]);
    } else if (event.key === "Escape") {
      setDismissedAt(suggestion.from);
    } else {
      return false;
    }
    return true;
  };

  // Combobox semantics on the editing surface while the popup is open.
  useEffect(() => {
    const dom = editor && !editor.isDestroyed ? editor.view.dom : null;
    if (!dom) {
      return;
    }
    if (popupOpen) {
      dom.setAttribute("aria-autocomplete", "list");
      dom.setAttribute("aria-controls", listboxId);
      dom.setAttribute("aria-expanded", "true");
      dom.setAttribute("aria-activedescendant", `${listboxId}-${activeIndex}`);
    } else {
      for (const name of [
        "aria-autocomplete",
        "aria-controls",
        "aria-expanded",
        "aria-activedescendant",
      ]) {
        dom.removeAttribute(name);
      }
    }
  }, [activeIndex, editor, listboxId, popupOpen]);

  return (
    <div className={cn(styles.root, className)} data-disabled={String(!editable)}>
      <EditorContent editor={editor} />
      {popupOpen && suggestion ? (
        <ul
          aria-label="Link suggestions"
          className={styles.suggestions}
          id={listboxId}
          role="listbox"
          style={{ left: suggestion.left, top: suggestion.bottom + 4 }}
        >
          {items.map((title, index) => (
            <li
              aria-selected={index === activeIndex}
              className={styles.suggestion}
              data-active={index === activeIndex}
              id={`${listboxId}-${index}`}
              key={title}
              onMouseDown={(event) => {
                event.preventDefault();
                insertSuggestion(title);
              }}
              role="option"
            >
              {title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
