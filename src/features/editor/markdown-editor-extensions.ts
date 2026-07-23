import { Image } from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

// Underline is disabled: it has no standard markdown form (it would serialize
// as non-standard `++text++`), and 10_DESIGN §5 scopes formatting to
// bold/italic/code/link. Image is added so `![alt](url)` survives the
// FR-NOTE-2 round-trip instead of collapsing to its alt text.
export const markdownEditorExtensions = [
  StarterKit.configure({ underline: false }),
  Image,
  Markdown,
];
