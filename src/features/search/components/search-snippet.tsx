import { snippetMatchEnd, snippetMatchStart } from "@/shared/types";

export interface SnippetPart {
  text: string;
  match: boolean;
}

/**
 * Split a search snippet on its match markers (ADR-36). Text between a start
 * and an end marker is a match; stray or unbalanced markers never leak into
 * the output. Everything stays plain text — React escapes it — so a snippet
 * can never inject markup (09_SECURITY T4).
 */
export function parseSnippet(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  let match = false;
  let buffer = "";

  const flush = () => {
    if (buffer) {
      parts.push({ match, text: buffer });
      buffer = "";
    }
  };

  for (const character of snippet) {
    if (character === snippetMatchStart || character === snippetMatchEnd) {
      flush();
      match = character === snippetMatchStart;
    } else {
      buffer += character;
    }
  }
  flush();
  return parts;
}

/** A result snippet with each matched term highlighted (FR-SEARCH-2). */
export function SearchSnippet({ snippet }: Readonly<{ snippet: string }>) {
  return (
    <>
      {parseSnippet(snippet).map((part, index) =>
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
