"use client";

import { useEffect, useState } from "react";

// 10_DESIGN §11 responsive tiers. Desktop is the design target; the narrower
// tiers are graceful degradation.
export type BreakpointTier = "desktop" | "tablet" | "mobile";

// Matches the §11 table: full shell ≥1280px, overlay right panel 768–1279px,
// single-column drawers <768px. Aligned to Tailwind's xl (1280) and md (768).
const tabletQuery = "(min-width: 768px) and (max-width: 1279.98px)";
const desktopQuery = "(min-width: 1280px)";

function readTier(): BreakpointTier {
  // SSR and jsdom (no matchMedia) fall back to the desktop design target, so
  // server output and the default test environment render the full shell.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "desktop";
  }

  if (window.matchMedia(desktopQuery).matches) {
    return "desktop";
  }

  if (window.matchMedia(tabletQuery).matches) {
    return "tablet";
  }

  return "mobile";
}

/**
 * Current responsive tier, updated on viewport changes. Renders "desktop" on
 * the server and until mount to avoid a hydration mismatch; the first client
 * effect corrects it.
 */
export function useBreakpointTier(): BreakpointTier {
  const [tier, setTier] = useState<BreakpointTier>("desktop");

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const queries = [window.matchMedia(desktopQuery), window.matchMedia(tabletQuery)];
    const update = () => setTier(readTier());

    update();
    for (const query of queries) {
      query.addEventListener("change", update);
    }

    return () => {
      for (const query of queries) {
        query.removeEventListener("change", update);
      }
    };
  }, []);

  return tier;
}
