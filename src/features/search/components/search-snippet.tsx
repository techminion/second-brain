import { snippetToPlainParts } from "../snippet-plain-text";

// Kept exported from here for existing callers and tests.
export { parseSnippet, type SnippetPart } from "../snippet-plain-text";

/**
 * A result snippet with each matched term highlighted (FR-SEARCH-2), with the
 * note's markdown syntax stripped (UX-08).
 */
export function SearchSnippet({ snippet }: Readonly<{ snippet: string }>) {
  return (
    <>
      {snippetToPlainParts(snippet).map((part, index) =>
        part.match ? (
          <mark className="bg-highlight/25 text-foreground rounded-sm px-0.5" key={index}>
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
