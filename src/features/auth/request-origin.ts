import { headers } from "next/headers";

function parseForwardedValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

/**
 * Resolves the externally visible, same-origin request URL without trusting a
 * caller-supplied redirect. Vercel's forwarded host/protocol are accepted only
 * when they agree with the browser Origin header.
 */
export async function getRequestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const requestOrigin = requestHeaders.get("origin");
  const forwardedHost = parseForwardedValue(requestHeaders.get("x-forwarded-host"));
  const host = forwardedHost ?? parseForwardedValue(requestHeaders.get("host"));

  if (!requestOrigin || !host || /[\s/?#\\]/.test(host)) {
    throw new Error("Missing or invalid request origin");
  }

  const origin = new URL(requestOrigin);
  const forwardedProtocol = parseForwardedValue(requestHeaders.get("x-forwarded-proto"));

  if (
    (origin.protocol !== "http:" && origin.protocol !== "https:") ||
    origin.host !== host ||
    (forwardedProtocol && `${forwardedProtocol}:` !== origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/"
  ) {
    throw new Error("Invalid request origin");
  }

  return origin.origin;
}
