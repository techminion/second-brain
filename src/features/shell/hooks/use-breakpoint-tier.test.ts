import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type BreakpointTier, useBreakpointTier } from "./use-breakpoint-tier";

let currentTier: BreakpointTier = "desktop";
const changeListeners = new Set<() => void>();

function matchesFor(query: string, tier: BreakpointTier): boolean {
  if (query.includes("1280px")) {
    return tier === "desktop";
  }
  return tier === "tablet";
}

function installMatchMedia(initial: BreakpointTier): void {
  currentTier = initial;
  changeListeners.clear();
  window.matchMedia = vi.fn((query: string) => ({
    addEventListener: (_: string, cb: () => void) => changeListeners.add(cb),
    addListener: () => {},
    dispatchEvent: () => false,
    get matches() {
      return matchesFor(query, currentTier);
    },
    media: query,
    onchange: null,
    removeEventListener: (_: string, cb: () => void) => changeListeners.delete(cb),
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function resizeTo(tier: BreakpointTier): void {
  currentTier = tier;
  for (const listener of changeListeners) {
    listener();
  }
}

afterEach(() => {
  // Restore jsdom's default (no matchMedia) so other suites see the SSR path.
  Reflect.deleteProperty(window, "matchMedia");
  changeListeners.clear();
});

describe("useBreakpointTier", () => {
  it("falls back to desktop when matchMedia is unavailable", () => {
    const { result } = renderHook(() => useBreakpointTier());

    expect(result.current).toBe("desktop");
  });

  it.each<BreakpointTier>(["desktop", "tablet", "mobile"])(
    "reports the %s tier from matchMedia",
    (tier) => {
      installMatchMedia(tier);

      const { result } = renderHook(() => useBreakpointTier());

      expect(result.current).toBe(tier);
    },
  );

  it("updates when the viewport crosses a breakpoint", () => {
    installMatchMedia("desktop");
    const { result } = renderHook(() => useBreakpointTier());
    expect(result.current).toBe("desktop");

    act(() => resizeTo("tablet"));
    expect(result.current).toBe("tablet");

    act(() => resizeTo("mobile"));
    expect(result.current).toBe("mobile");
  });

  it("stops listening after unmount", () => {
    installMatchMedia("desktop");
    const { unmount } = renderHook(() => useBreakpointTier());

    expect(changeListeners.size).toBeGreaterThan(0);
    unmount();
    expect(changeListeners.size).toBe(0);
  });
});
