import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.resolve(currentDirectory, "../../app/globals.css");

interface Rgb {
  blue: number;
  green: number;
  red: number;
}

function hslToRgb(hsl: string): Rgb {
  const [hue, saturation, lightness] = hsl.split(/\s+/).map((value) => Number.parseFloat(value));
  const saturationDecimal = saturation / 100;
  const lightnessDecimal = lightness / 100;
  const chroma = (1 - Math.abs(2 * lightnessDecimal - 1)) * saturationDecimal;
  const intermediate = ((hue % 360) / 60) % 2;
  const secondary = chroma * (1 - Math.abs(intermediate - 1));
  const match = lightnessDecimal - chroma / 2;
  const [red, green, blue] =
    hue < 60
      ? [chroma, secondary, 0]
      : hue < 120
        ? [secondary, chroma, 0]
        : hue < 180
          ? [0, chroma, secondary]
          : hue < 240
            ? [0, secondary, chroma]
            : hue < 300
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];

  return { blue: blue + match, green: green + match, red: red + match };
}

function relativeLuminance({ red, green, blue }: Rgb) {
  const linearize = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [
    relativeLuminance(hslToRgb(first)),
    relativeLuminance(hslToRgb(second)),
  ].sort((left, right) => right - left);

  return (lighter + 0.05) / (darker + 0.05);
}

function getToken(block: string, name: string) {
  const match = block.match(new RegExp(`--${name}: ([^;]+);`));
  if (!match) throw new Error(`Missing --${name} token.`);
  return match[1];
}

// Every token used as text, checked on every surface it can sit on (ADR-39).
const textTokens = [
  "foreground",
  "muted-foreground",
  "primary",
  "backlink-text",
  "positive-text",
  "highlight-text",
  "mention-text",
  "tag-text",
] as const;
const surfaceTokens = ["background", "surface", "muted"] as const;

describe("semantic color tokens", () => {
  it("keeps every text token at AA (4.5:1) on every surface, in both themes", async () => {
    const css = await readFile(cssPath, "utf8");
    const [light, dark] = css.split(".dark {");

    for (const block of [light, dark]) {
      for (const text of textTokens) {
        for (const surface of surfaceTokens) {
          const ratio = contrastRatio(getToken(block, text), getToken(block, surface));
          expect(ratio, `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(
        contrastRatio(getToken(block, "primary-foreground"), getToken(block, "primary")),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(getToken(block, "destructive-foreground"), getToken(block, "destructive")),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the focus ring at the 3:1 non-text minimum (WCAG 1.4.11)", async () => {
    const css = await readFile(cssPath, "utf8");
    const [light, dark] = css.split(".dark {");

    for (const block of [light, dark]) {
      expect(
        contrastRatio(getToken(block, "ring"), getToken(block, "background")),
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps every graph palette colour at 3:1 on the canvas, in both themes (UX-11, ADR-42)", async () => {
    const css = await readFile(cssPath, "utf8");
    const [light, dark] = css.split(".dark {");

    for (const block of [light, dark]) {
      for (let index = 1; index <= 8; index += 1) {
        const colour = getToken(block, `graph-${index}`);
        for (const surface of ["background", "surface"]) {
          expect(
            contrastRatio(colour, getToken(block, surface)),
            `--graph-${index} on --${surface}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});
