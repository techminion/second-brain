import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownEditor } from "./components/markdown-editor";
import { normalizeMarkdown } from "./markdown-round-trip";
import { isSafeImageSrc } from "./safe-image-src";

// EDIT-16: hostile markdown corpus (09_SECURITY §9 T4). Whatever a note body
// contains, the rendered editor DOM must hold no script-capable element, no
// inline event handler, and no URL sink carrying an executable scheme.
const hostileCorpus: [string, string][] = [
  ["script tag", "<script>alert(1)</script>"],
  ["img onerror", '<img src=x onerror="alert(1)">'],
  ["svg onload", "<svg onload=alert(1)><script>alert(1)</script></svg>"],
  ["iframe", '<iframe src="https://evil.example"></iframe>'],
  ["object/embed", '<object data="javascript:alert(1)"></object><embed src="x.swf">'],
  ["html anchor with javascript", '<a href="javascript:alert(1)">x</a>'],
  ["style tag", "<style>body{background:url(javascript:alert(1))}</style>"],
  ["form action", '<form action="javascript:alert(1)"><button>go</button></form>'],
  ["markdown link javascript", "[click](javascript:alert(1))"],
  ["mixed-case scheme", "[click](JaVaScRiPt:alert(1))"],
  ["leading whitespace scheme", "[click](  javascript:alert(1))"],
  ["entity-encoded scheme", "[click](&#106;avascript:alert(1))"],
  ["vbscript link", "[x](vbscript:msgbox(1))"],
  ["data html link", "[x](data:text/html,<script>alert(1)</script>)"],
  ["image javascript src", "![img](javascript:alert(1))"],
  ["image data svg", "![img](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+)"],
  ["image protocol-relative", "![img](//evil.example/pixel.png)"],
  ["inline code with markup", "`<script>alert(1)</script>`"],
  ["fenced code with markup", "```html\n<img src=x onerror=alert(1)>\n```"],
  ["wiki link with markup", "[[<script>alert(1)</script>]]"],
  ["task item with markup", "- [ ] <img src=x onerror=alert(1)> task"],
  ["table cell with markup", "| a |\n| --- |\n| <img src=x onerror=alert(1)> |"],
  ["table cell with hostile br", "| a |\n| --- |\n| x<br onmouseover=alert(1)>y |"],
  ["table cell javascript link", "| a |\n| --- |\n| [x](javascript:alert(1)) |"],
  ["fenced code with hostile info string", '```js" onmouseover="alert(1)\nx\n```'],
];

const dangerousScheme = /^\s*(javascript|vbscript|data):/i;

function assertSanitized(root: Element): void {
  expect(root.querySelector("script, iframe, object, embed, style, form, svg, math")).toBeNull();

  for (const element of root.querySelectorAll("*")) {
    for (const attribute of element.attributes) {
      expect(attribute.name.startsWith("on"), `${element.tagName} ${attribute.name}`).toBe(false);
    }
  }

  for (const anchor of root.querySelectorAll("a[href]")) {
    expect(anchor.getAttribute("href") ?? "").not.toMatch(dangerousScheme);
  }

  for (const image of root.querySelectorAll("img[src]")) {
    expect(isSafeImageSrc(image.getAttribute("src")), image.getAttribute("src") ?? "").toBe(true);
  }
}

describe("EDIT-16 hostile markdown renders sanitized", () => {
  it.each(hostileCorpus)("%s", async (_name, markdown) => {
    const { container } = render(<MarkdownEditor onChange={() => undefined} value={markdown} />);

    const editor = await waitFor(() => {
      const element = container.querySelector(".ProseMirror");
      expect(element).not.toBeNull();
      return element as Element;
    });

    assertSanitized(editor);
  });

  it("keeps a blocked image source in the markdown (render-time sanitization only)", () => {
    expect(normalizeMarkdown("![img](javascript:alert(1))")).toBe("![img](javascript:alert(1))");
  });

  it("still renders safe image sources", async () => {
    const { container } = render(
      <MarkdownEditor
        onChange={() => undefined}
        value={"![a](https://example.com/a.png)\n\n![b](/api/attachments/b)"}
      />,
    );

    await waitFor(() => {
      const sources = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
      expect(sources).toEqual(["https://example.com/a.png", "/api/attachments/b"]);
    });
  });
});

describe("isSafeImageSrc", () => {
  it.each(["https://a.dev/x.png", "http://a.dev/x.png", "HTTPS://A.DEV/X", "/relative/path.png"])(
    "allows %s",
    (src) => {
      expect(isSafeImageSrc(src)).toBe(true);
    },
  );

  it.each([
    "javascript:alert(1)",
    "java\tscript:alert(1)",
    " javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "vbscript:x",
    "//evil.example/x.png",
    "/\\evil.example",
    "relative.png",
    "",
    null,
    undefined,
    42,
  ])("blocks %s", (src) => {
    expect(isSafeImageSrc(src)).toBe(false);
  });
});
