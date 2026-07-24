// Public API of the editor feature. Cross-feature consumers (e.g. the note
// page, NOTE-10) import the editor from here — never from ./components — so the
// feature-boundary rule is respected. The MarkdownEditor stays in this feature
// because it is coupled to the editor-domain markdown logic (extensions +
// round-trip serializer) it composes.
export { MarkdownEditor, type MarkdownEditorProps } from "./components/markdown-editor";
