import { describe, expect, it } from "vitest";

import { snippetToPlainParts } from "./snippet-plain-text";

const S = "\u0002";
const E = "\u0003";

/** Render parts as text with [matches] bracketed, for compact assertions. */
function view(snippet: string): string {
  return snippetToPlainParts(snippet)
    .map((part) => (part.match ? `<${part.text}>` : part.text))
    .join("");
}

describe("snippetToPlainParts", () => {
  it("strips the UX-08 acceptance example and keeps the heading match", () => {
    // ts_headline joins lines with spaces.
    const snippet = `## ${S}Roadmap${E} - **ship** [[Q3 plan]] via [docs](https://x)`;

    const parts = snippetToPlainParts(snippet);

    expect(parts).toEqual([
      { match: true, text: "Roadmap" },
      { match: false, text: " ship Q3 plan via docs" },
    ]);
    const text = parts.map((p) => p.text).join("");
    for (const syntax of ["#", "*", "[[", "](", "`"]) {
      expect(text).not.toContain(syntax);
    }
  });

  it.each([
    ["heading mid-string", `intro ## ${S}Goals${E} next`, "intro <Goals> next"],
    ["h6 after the fragment delimiter", `a … ###### ${S}Deep${E}`, "a … <Deep>"],
    ["quote mid-string", `said > ${S}think${E} more`, "said <think> more"],
    ["bullet mid-string", `list - ${S}one${E} + two * three`, "list <one> two three"],
    ["task boxes", `todo - [ ] ${S}ship${E} - [x] done`, "todo <ship> done"],
    ["ordered list at the start", `1. ${S}First${E} step`, "<First> step"],
    ["bold around a match", `go **${S}ship${E}** it`, "go <ship> it"],
    ["italic around a match", `a *${S}word${E}* and _${S}other${E}_`, "a <word> and <other>"],
    ["strike and code around a match", `~~${S}old${E}~~ \`${S}code${E}\``, "<old> <code>"],
    ["match inside bold text", `**big ${S}ship${E} day**`, "big <ship> day"],
    ["match inside a wiki link", `see [[${S}Q3${E} plan]] now`, "see <Q3> plan now"],
    ["match inside link text", `read [the ${S}docs${E}](https://x.y/z) now`, "read the <docs> now"],
    ["image alt", `![${S}chart${E}](c.png) shown`, "<chart> shown"],
    [
      "fence with a language",
      `before \`\`\`ts const ${S}layout${E} = 1; \`\`\` after`,
      "before const <layout> = 1; after",
    ],
    ["tilde fence", `~~~ ${S}x${E} ~~~`, "<x>"],
    [
      "table",
      `| Book | ${S}Status${E} | | --- | :---: | | BASB | Done |`,
      "Book <Status> BASB Done",
    ],
    ["fragment delimiter kept", `one ${S}hit${E} … two ${S}hit${E}`, "one <hit> … two <hit>"],
    ["dangling wiki link at an edge", `[[Q3 pl … ${S}plan${E}]] end`, "Q3 pl … <plan> end"],
    ["dangling link tail at an edge", `docs](https://x) and ${S}more${E}`, "docs and <more>"],
    ["dangling bold at an edge", `** ${S}tail${E}`, "<tail>"],
    [
      "snake_case and 2*3 untouched",
      `rename snake_case_${S}name${E}; 2*3`,
      "rename snake_case_<name>; 2*3",
    ],
    ["CRLF", `## ${S}Title${E}\r\n- item`, "<Title> item"],
  ])("%s", (_name, snippet, expected) => {
    expect(view(snippet)).toBe(expected);
  });

  it("never leaks markers and drops empty matches", () => {
    const parts = snippetToPlainParts(`a ${S}**${E} b ${S}${E} c`);

    expect(parts).toEqual([{ match: false, text: "a b c" }]);
    for (const part of parts) {
      for (const marker of [S, E, "\uE000", "\uE001"]) {
        expect(part.text).not.toContain(marker);
      }
    }
  });

  it("degrades unbalanced markers like parseSnippet", () => {
    expect(view(`stray${E} end and ${S}open tail`)).toBe("stray end and <open tail>");
  });

  it("returns no parts for an empty snippet", () => {
    expect(snippetToPlainParts("")).toEqual([]);
  });

  it("keeps HTML as plain text", () => {
    expect(view(`<script>alert(1)</script> ${S}hit${E}`)).toBe("<script>alert(1)</script> <hit>");
  });
});
