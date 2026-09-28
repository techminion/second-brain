import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// Paste handling (EDIT-11, 10_DESIGN §5). Rich text (a `text/html` clipboard)
// is left to ProseMirror, whose schema-bound DOM parser converts it to our
// nodes and drops everything else — the same XSS floor as loading a note
// (EDIT-16), and the saved form is markdown like any other edit. Plain text
// that looks like markdown is parsed as markdown instead of being inserted
// with its syntax as literal characters. Inside a code block, or for a plain
// single line with no markdown syntax, the default literal paste applies.
// Pasted images wait for attachments (ATT).

const blockSyntax = [
  /^#{1,6}\s/m, // heading
  /^\s*[-*+]\s/m, // bullet list (incl. task items)
  /^\s*\d+[.)]\s/m, // ordered list
  /^>\s?/m, // blockquote
  /^```/m, // fence
  /^\s*\|.*\|\s*$\n^\s*\|?\s*:?-{3,}/m, // table header + delimiter row
  /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/m, // horizontal rule
];

const inlineSyntax = [
  /\*\*[^*\n]+\*\*/, // strong
  /(?<![\w*])\*[^*\s][^*\n]*\*(?![\w*])/, // emphasis
  /`[^`\n]+`/, // code span
  /!?\[[^\]\n]+\]\([^)\s]+\)/, // link / image
];

/**
 * Whether pasted plain text should be parsed as markdown. Any block syntax
 * qualifies; inline syntax qualifies too, because a markdown-first editor
 * should render `**bold**` rather than store literal asterisks. Wiki links are
 * plain text either way and do not count.
 */
export function looksLikeMarkdown(text: string): boolean {
  return (
    blockSyntax.some((pattern) => pattern.test(text)) ||
    inlineSyntax.some((pattern) => pattern.test(text))
  );
}

export const markdownPastePluginKey = new PluginKey("markdownPaste");

export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: markdownPastePluginKey,
        props: {
          handlePaste(view, event) {
            const clipboard = event.clipboardData;
            if (!clipboard || clipboard.types.includes("text/html") || !editor.markdown) {
              return false;
            }
            if (view.state.selection.$from.parent.type.spec.code) {
              return false;
            }

            const text = clipboard.getData("text/plain");
            if (!text || !looksLikeMarkdown(text)) {
              return false;
            }

            return editor.commands.insertContent(text, { contentType: "markdown" });
          },
        },
      }),
    ];
  },
});
