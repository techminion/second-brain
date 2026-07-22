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

describe("semantic color tokens", () => {
  it("keeps ADR-8's required text contrast pairs at AA", async () => {
    const css = await readFile(cssPath, "utf8");
    const [light, dark] = css.split(".dark {");

    for (const block of [light, dark]) {
      const background = getToken(block, "background");
      expect(contrastRatio(getToken(block, "foreground"), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(getToken(block, "muted-foreground"), background)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio(getToken(block, "primary"), background)).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(getToken(block, "destructive-foreground"), getToken(block, "destructive")),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("motion tokens", () => {
  it("defines only the documented micro and structural durations", async () => {
    const css = await readFile(cssPath, "utf8");
    const rootBlock = css.split(".dark {")[0];

    expect(getToken(rootBlock, "motion-duration-micro")).toBe("150ms");
    expect(getToken(rootBlock, "motion-duration-structural")).toBe("250ms");
    expect(css).toContain("transition-duration: var(--motion-duration-micro)");
    expect(css).toContain("transition-duration: var(--motion-duration-structural)");
  });

  it("collapses both duration tokens when reduced motion is requested", async () => {
    const css = await readFile(cssPath, "utf8");
    const reducedMotionBlock = css.match(
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(reducedMotionBlock).toBeDefined();
    expect(getToken(reducedMotionBlock ?? "", "motion-duration-micro")).toBe("0ms");
    expect(getToken(reducedMotionBlock ?? "", "motion-duration-structural")).toBe("0ms");
  });
});
