"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";

import { cn } from "@/shared/lib/utils";

import { markdownEditorExtensions } from "../markdown-editor-extensions";
import { serializeEditorMarkdown } from "../markdown-round-trip";
import styles from "./markdown-editor.module.css";

export interface MarkdownEditorProps {
  value: string;
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
}: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: markdownEditorExtensions,
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

  return (
    <div className={cn(styles.root, className)} data-disabled={String(!editable)}>
      <EditorContent editor={editor} />
    </div>
  );
}
