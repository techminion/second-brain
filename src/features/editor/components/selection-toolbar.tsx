"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Code, Italic, Link2, Unlink } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import styles from "./markdown-editor.module.css";

// A link target must be a web or mail address; anything else (javascript:,
// data:, relative paths) is refused before it reaches the document.
const allowedLink = /^(https?:\/\/|mailto:)\S+$/i;

export function normalizeLinkTarget(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  return allowedLink.test(withScheme) ? withScheme : null;
}

/**
 * Floating formatting toolbar on a text selection (EDIT-09, 10_DESIGN §5):
 * bold, italic, code and link — no persistent toolbar row. Keyboard shortcuts
 * remain primary; the toolbar is the pointer path. Hidden inside code blocks,
 * where marks do not apply.
 */
export function SelectionToolbar({ editor }: Readonly<{ editor: Editor }>) {
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      code: current.isActive("code"),
      href: (current.getAttributes("link").href as string | undefined) ?? null,
      italic: current.isActive("italic"),
    }),
  });

  const closeLink = () => {
    setLinkDraft(null);
    setLinkError(false);
  };

  const applyLink = (event: FormEvent) => {
    event.preventDefault();
    const target = normalizeLinkTarget(linkDraft ?? "");
    if (!target) {
      setLinkError(true);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: target }).run();
    closeLink();
  };

  const onLinkKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLink();
      editor.commands.focus();
    }
  };

  const markButton = (label: string, Icon: typeof Bold, pressed: boolean, toggle: () => void) => (
    <Button
      aria-label={label}
      aria-pressed={pressed}
      className="aria-pressed:bg-muted aria-pressed:text-primary size-8"
      onClick={toggle}
      onMouseDown={(event) => event.preventDefault()}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" className="size-4" />
    </Button>
  );

  return (
    <BubbleMenu
      className={styles.toolbar}
      editor={editor}
      options={{ placement: "top" }}
      shouldShow={({ editor: current, from, to }) =>
        current.isEditable &&
        from !== to &&
        !current.isActive("codeBlock") &&
        current.state.doc.textBetween(from, to).trim().length > 0
      }
    >
      {linkDraft === null ? (
        <div aria-label="Formatting" className="flex items-center gap-0.5" role="toolbar">
          {markButton("Bold", Bold, active?.bold ?? false, () =>
            editor.chain().focus().toggleBold().run(),
          )}
          {markButton("Italic", Italic, active?.italic ?? false, () =>
            editor.chain().focus().toggleItalic().run(),
          )}
          {markButton("Code", Code, active?.code ?? false, () =>
            editor.chain().focus().toggleCode().run(),
          )}
          {active?.href
            ? markButton("Remove link", Unlink, true, () =>
                editor.chain().focus().extendMarkRange("link").unsetLink().run(),
              )
            : markButton("Link", Link2, false, () => setLinkDraft(""))}
        </div>
      ) : (
        <form aria-label="Add link" className="flex items-center gap-1" onSubmit={applyLink}>
          <Input
            aria-describedby={linkError ? "selection-link-error" : undefined}
            aria-invalid={linkError}
            aria-label="Link address"
            autoFocus
            className="h-8 w-56"
            onChange={(event) => {
              setLinkDraft(event.target.value);
              setLinkError(false);
            }}
            onKeyDown={onLinkKeyDown}
            placeholder="https://…"
            value={linkDraft}
          />
          <Button className="h-8" size="sm" type="submit">
            Add
          </Button>
          {linkError ? (
            <span className="text-destructive text-xs" id="selection-link-error" role="alert">
              Use an https:// or mailto: address.
            </span>
          ) : null}
        </form>
      )}
    </BubbleMenu>
  );
}
