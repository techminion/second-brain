import { stripInlineMarkdown } from "@/shared/lib/markdown-plain-text";
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

// Private-use stand-ins for the ADR-36 match markers while the markdown rules
// run. They are not whitespace, so the rules treat them like word characters
// and a match inside `**…**`, `[[…]]` or `[…](…)` keeps its range.
const matchStart = "\uE000";
const matchEnd = "\uE001";

/**
 * A search snippet (raw-markdown `ts_headline` output with \u0002/\u0003 match
 * markers) → plain-text parts with matches flagged (UX-08). Markdown syntax is
 * stripped with the shared rule set in its mid-string mode, since ts_headline
 * turns newlines into spaces. Unbalanced markers degrade exactly as
 * `parseSnippet` does, and empty matches are dropped. The result is plain
 * text for React to escape (09_SECURITY T4).
 */
export function snippetToPlainParts(snippet: string): SnippetPart[] {
  const marked = parseSnippet(snippet)
    .map((part) => (part.match ? `${matchStart}${part.text}${matchEnd}` : part.text))
    .join("");

  const plain = stripInlineMarkdown(marked, { inlineBlockMarkers: true });

  const parts: SnippetPart[] = [];
  let match = false;
  let buffer = "";
  const flush = () => {
    if (buffer) {
      const previous = parts.at(-1);
      if (previous && previous.match === match) {
        previous.text += buffer;
      } else {
        parts.push({ match, text: buffer });
      }
      buffer = "";
    }
  };

  for (const character of plain) {
    if (character === matchStart || character === matchEnd) {
      flush();
      match = character === matchStart;
    } else {
      buffer += character;
    }
  }
  flush();

  // A match reduced to whitespace is not worth a <mark>.
  return parts
    .map((part) => (part.match && !part.text.trim() ? { ...part, match: false } : part))
    .reduce<SnippetPart[]>((merged, part) => {
      const previous = merged.at(-1);
      // Removing a marker can leave two spaces either side of it.
      let text = part.text.replace(/ {2,}/g, " ");
      if (previous?.text.endsWith(" ")) {
        text = text.replace(/^ +/, "");
      }
      if (!text) {
        return merged;
      }
      if (previous && previous.match === part.match) {
        previous.text = `${previous.text}${text}`.replace(/ {2,}/g, " ");
      } else {
        merged.push({ match: part.match, text });
      }
      return merged;
    }, []);
}
