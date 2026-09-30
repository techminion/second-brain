/**
 * Markdown-aware chunking for embeddings (EMB-02, 07_AI §4, ADR-38).
 *
 * A note at or under the target size is one chunk. A longer note is split on
 * markdown structure, coarsest first — heading sections, then blank-line
 * blocks, then lines, sentences and words, with a hard character split only
 * for a single run longer than a chunk — and adjacent pieces are packed back
 * together up to the budget, so a boundary falls on the coarsest structure
 * that fits. Fenced code blocks are never split at a heading or blank line
 * inside the fence. Pieces below the floor merge into a neighbour, and every
 * chunk after the first starts with ~75 tokens of the previous one.
 *
 * Every chunk is an exact (trimmed) substring of the input, in order. Tokens
 * are estimated at four characters each — no tokenizer (ADR-38).
 */

export interface TextChunk {
  /** Order within the note — the `embeddings.chunk_index` value. */
  index: number;
  text: string;
}

export const chunkingLimits = {
  charsPerToken: 4,
  minTokens: 50,
  overlapTokens: 75,
  targetTokens: 500,
} as const;

const { charsPerToken, minTokens, overlapTokens, targetTokens } = chunkingLimits;
const targetChars = targetTokens * charsPerToken;
const overlapChars = overlapTokens * charsPerToken;
const minChars = minTokens * charsPerToken;
// Room for the overlap is reserved, so an overlapped chunk stays near target.
const packChars = targetChars - overlapChars;

/** Approximate token count used for every chunking size decision. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / charsPerToken);
}

interface Span {
  end: number;
  start: number;
}

type Splitter = (text: string, span: Span) => number[];

const headingLine = /^#{1,6}[ \t]/;
const fenceLine = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Line starts inside `span`, with whether each line is inside a fenced code
 * block. Spans passed here always begin outside a fence (the whole note, or a
 * heading section).
 */
function linesOf(text: string, span: Span): { fenced: boolean; start: number }[] {
  const lines: { fenced: boolean; start: number }[] = [];
  let fence: string | null = null;
  let start = span.start;
  while (start < span.end) {
    const newline = text.indexOf("\n", start);
    const end = newline === -1 || newline >= span.end ? span.end : newline;
    const line = text.slice(start, end);
    const marker = fenceLine.exec(line)?.[1];
    lines.push({ fenced: fence !== null && !(marker && closesFence(fence, marker)), start });
    if (marker) {
      if (fence === null) {
        fence = marker;
      } else if (closesFence(fence, marker)) {
        fence = null;
      }
    }
    start = end + 1;
  }
  return lines;
}

function closesFence(open: string, marker: string): boolean {
  return marker[0] === open[0] && marker.length >= open.length;
}

function lineAt(text: string, start: number, spanEnd: number): string {
  const newline = text.indexOf("\n", start);
  return text.slice(start, newline === -1 || newline >= spanEnd ? spanEnd : newline);
}

const splitAtHeadings: Splitter = (text, span) =>
  linesOf(text, span)
    .filter(
      (line) =>
        line.start > span.start &&
        !line.fenced &&
        headingLine.test(lineAt(text, line.start, span.end)),
    )
    .map((line) => line.start);

const splitAtBlankLines: Splitter = (text, span) => {
  const cuts: number[] = [];
  let previousBlank = false;
  for (const line of linesOf(text, span)) {
    const blank = !line.fenced && lineAt(text, line.start, span.end).trim() === "";
    if (!blank && previousBlank && line.start > span.start) {
      cuts.push(line.start);
    }
    previousBlank = blank;
  }
  return cuts;
};

function cutsAfter(pattern: RegExp): Splitter {
  return (text, span) => {
    const cuts: number[] = [];
    const slice = text.slice(span.start, span.end);
    for (const match of slice.matchAll(pattern)) {
      const cut = span.start + match.index + match[0].length;
      if (cut < span.end) {
        cuts.push(cut);
      }
    }
    return cuts;
  };
}

const splitters: Splitter[] = [
  splitAtHeadings,
  splitAtBlankLines,
  cutsAfter(/\n/g),
  cutsAfter(/[.!?]+["')\]]*\s+/g),
  cutsAfter(/\s+/g),
];

function partsBetween(span: Span, cuts: number[]): Span[] {
  const bounds = [span.start, ...cuts, span.end];
  return bounds.slice(1).map((end, index) => ({ end, start: bounds[index] ?? span.start }));
}

/** Splits a span into contiguous pieces of at most `packChars` each. */
function splitSpan(text: string, span: Span, level: number): Span[] {
  if (span.end - span.start <= packChars) {
    return [span];
  }
  const splitter = splitters[level];
  if (!splitter) {
    const pieces: Span[] = [];
    for (let start = span.start; start < span.end; start += packChars) {
      pieces.push({ end: Math.min(start + packChars, span.end), start });
    }
    return pieces;
  }
  const cuts = splitter(text, span);
  if (cuts.length === 0) {
    return splitSpan(text, span, level + 1);
  }
  const pieces = partsBetween(span, cuts).flatMap((part) => splitSpan(text, part, level + 1));
  return packAdjacent(pieces);
}

/** Greedily re-joins contiguous pieces while the result fits the budget. */
function packAdjacent(pieces: Span[]): Span[] {
  const packed: Span[] = [];
  for (const piece of pieces) {
    const last = packed.at(-1);
    if (last && piece.end - last.start <= packChars) {
      packed[packed.length - 1] = { end: piece.end, start: last.start };
    } else {
      packed.push(piece);
    }
  }
  return packed;
}

/** Merges pieces whose content is under the floor into a neighbour. */
function mergeBelowFloor(text: string, pieces: Span[]): Span[] {
  const merged: Span[] = [];
  let carryStart: number | null = null;
  for (const piece of pieces) {
    const span: Span = { end: piece.end, start: carryStart ?? piece.start };
    carryStart = null;
    if (text.slice(span.start, span.end).trim().length >= minChars) {
      merged.push(span);
      continue;
    }
    const last = merged.at(-1);
    if (last) {
      merged[merged.length - 1] = { end: span.end, start: last.start };
    } else {
      carryStart = span.start;
    }
  }
  if (carryStart !== null) {
    merged.push({ end: text.length, start: carryStart });
  }
  return merged;
}

/**
 * Where the overlap into `current` begins: up to `overlapChars` back into the
 * previous piece, moved forward to the first sentence or line start in that
 * window, else the first word start, so the overlap never opens mid-word.
 */
function overlapStart(text: string, previous: Span, current: Span): number {
  const windowStart = Math.max(previous.start, current.start - overlapChars);
  if (windowStart === 0 || text[windowStart - 1] === "\n") {
    return windowStart;
  }
  const window = text.slice(windowStart, current.start);
  const boundary = /[.!?]+["')\]]*\s+|\n/.exec(window) ?? /\s+/.exec(window);
  return boundary ? windowStart + boundary.index + boundary[0].length : current.start;
}

/** Splits a note body into ordered embedding chunks (07_AI §4). */
export function chunkMarkdown(markdown: string): TextChunk[] {
  const text = markdown.replace(/\r\n?/g, "\n");
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  if (estimateTokens(trimmed) <= targetTokens) {
    return [{ index: 0, text: trimmed }];
  }

  const pieces = mergeBelowFloor(text, splitSpan(text, { end: text.length, start: 0 }, 0));
  return pieces.map((piece, index) => {
    const previous = pieces[index - 1];
    const start = previous ? overlapStart(text, previous, piece) : piece.start;
    return { index, text: text.slice(start, piece.end).trim() };
  });
}
