"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/shared/lib/utils";

import { EscapeFocus } from "../escape-focus-extension";
import { FindInNote } from "../find-in-note-extension";
import { markdownEditorExtensions } from "../markdown-editor-extensions";
import { serializeEditorMarkdown } from "../markdown-round-trip";
import { filterSlashCommands, type SlashCommand } from "../slash-commands";
import { SlashMenu, type SlashTrigger } from "../slash-menu-extension";
import { wikiLinkRefreshMeta, WikiLinks, type WikiLinkSuggestion } from "../wiki-link-extension";
import { FindBar } from "./find-bar";
import styles from "./markdown-editor.module.css";
import { SelectionToolbar } from "./selection-toolbar";
import { handleSuggestionKey, SuggestionList } from "./suggestion-list";

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
  /**
   * Bind ⌘F / Ctrl+F page-wide to find within this document (EDIT-18). Only
   * the page's primary editor should opt in.
   */
  findShortcut?: boolean;
  /**
   * `document` drops the field chrome (border, focus outline, inset) so the
   * body reads as the page itself, as on the note page (UX-02); the caret is
   * the focus indicator there. `field` (default) keeps the boxed input look.
   */
  variant?: "document" | "field";
}

export function MarkdownEditor({
  value,
  onChange,
  ariaLabel = "Note body",
  className,
  editable = true,
  findShortcut = false,
  variant = "field",
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

  // Slash menu (EDIT-08): `/` at the start of a paragraph lists block commands.
  const slashListboxId = useId();
  const [slashTrigger, setSlashTrigger] = useState<SlashTrigger | null>(null);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [slashDismissedAt, setSlashDismissedAt] = useState<number | null>(null);
  const slashItems = useMemo(
    () => (slashTrigger ? filterSlashCommands(slashTrigger.query) : []),
    [slashTrigger],
  );
  const slashOpen =
    slashTrigger !== null && slashDismissedAt !== slashTrigger.from && slashItems.length > 0;
  const slashKeyHandlerRef = useRef<(event: KeyboardEvent) => boolean>(() => false);

  const [find, setFind] = useState<{ openedAt: number; initialQuery: string } | null>(null);

  const extensions = useMemo(
    () => [
      ...markdownEditorExtensions,
      WikiLinks.configure({
        isResolved: (title) => wikiLinksRef.current?.isResolved(title) ?? true,
        onSuggest: (next) => setSuggestion(wikiLinksRef.current ? next : null),
        onSuggestKeyDown: (event) => keyHandlerRef.current(event),
        open: (title) => wikiLinksRef.current?.open(title),
      }),
      FindInNote,
      EscapeFocus,
      SlashMenu.configure({
        onKeyDown: (event) => slashKeyHandlerRef.current(event),
        onTrigger: (next) => {
          setSlashTrigger(next);
          setSlashActiveIndex(0);
        },
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

  // ⌘F opens the find bar, seeded with a short single-line selection.
  useEffect(() => {
    if (!findShortcut || !editor) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.shiftKey ||
        event.altKey ||
        event.key.toLowerCase() !== "f"
      ) {
        return;
      }
      event.preventDefault();
      const { from, to } = editor.state.selection;
      const selected = editor.state.doc.textBetween(from, to, " ");
      const initialQuery = selected.length <= 100 && !selected.includes("\n") ? selected : "";
      setFind({ initialQuery, openedAt: Date.now() });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editor, findShortcut]);

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
    return handleSuggestionKey(event, items.length, {
      dismiss: () => setDismissedAt(suggestion.from),
      move: (delta) => setActiveIndex((index) => (index + delta + items.length) % items.length),
      pick: () => insertSuggestion(items[activeIndex] ?? items[0]),
    });
  };

  const runSlashCommand = useCallback(
    (command: SlashCommand) => {
      if (!editor || !slashTrigger) {
        return;
      }
      command.run(editor, { from: slashTrigger.from, to: slashTrigger.to });
      setSlashTrigger(null);
    },
    [editor, slashTrigger],
  );

  slashKeyHandlerRef.current = (event) => {
    if (!slashOpen || !slashTrigger) {
      return false;
    }
    return handleSuggestionKey(event, slashItems.length, {
      dismiss: () => setSlashDismissedAt(slashTrigger.from),
      move: (delta) =>
        setSlashActiveIndex((index) => (index + delta + slashItems.length) % slashItems.length),
      pick: () => runSlashCommand(slashItems[slashActiveIndex] ?? slashItems[0]),
    });
  };

  // Combobox semantics on the editing surface while either popup is open.
  const activeListbox = popupOpen
    ? { id: listboxId, index: activeIndex }
    : slashOpen
      ? { id: slashListboxId, index: slashActiveIndex }
      : null;
  const activeListboxId = activeListbox?.id;
  const activeOptionIndex = activeListbox?.index;
  useEffect(() => {
    const dom = editor && !editor.isDestroyed ? editor.view.dom : null;
    if (!dom) {
      return;
    }
    if (activeListboxId !== undefined) {
      // `aria-expanded` is not allowed on role="textbox" (only on combobox);
      // autocomplete + controls + activedescendant carry the relationship.
      dom.setAttribute("aria-autocomplete", "list");
      dom.setAttribute("aria-controls", activeListboxId);
      dom.setAttribute("aria-activedescendant", `${activeListboxId}-${activeOptionIndex ?? 0}`);
    } else {
      for (const name of ["aria-autocomplete", "aria-controls", "aria-activedescendant"]) {
        dom.removeAttribute(name);
      }
    }
  }, [activeListboxId, activeOptionIndex, editor]);

  return (
    <div
      className={cn(styles.root, className)}
      data-disabled={String(!editable)}
      data-variant={variant}
    >
      {editor && find ? (
        <FindBar
          editor={editor}
          initialQuery={find.initialQuery}
          onClose={() => setFind(null)}
          openedAt={find.openedAt}
        />
      ) : null}
      <EditorContent editor={editor} />
      {editor && editable ? <SelectionToolbar editor={editor} /> : null}
      {popupOpen && suggestion ? (
        <SuggestionList
          activeIndex={activeIndex}
          getKey={(title) => title}
          id={listboxId}
          items={items}
          label="Link suggestions"
          onPick={insertSuggestion}
          position={suggestion}
          renderItem={(title) => title}
        />
      ) : null}
      {slashOpen && slashTrigger ? (
        <SuggestionList
          activeIndex={slashActiveIndex}
          getKey={(command) => command.id}
          id={slashListboxId}
          items={slashItems}
          label="Insert block"
          onPick={runSlashCommand}
          position={slashTrigger}
          renderItem={(command) => (
            <span className={styles.command}>
              <span>{command.label}</span>
              <span className={styles.commandHint}>{command.description}</span>
            </span>
          )}
        />
      ) : null}
    </div>
  );
}
