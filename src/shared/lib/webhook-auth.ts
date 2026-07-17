import { createHash, timingSafeEqual } from "node:crypto";

export const webhookSecretHeaderName = "x-webhook-secret";

/**
 * Constant-time shared-secret comparison. Secrets are hashed to equal-length
 * digests first so `timingSafeEqual` is usable regardless of input lengths
 * and no length information leaks through early rejection.
 */
export function isWebhookSecretValid(
  providedSecret: string | null,
  expectedSecret: string,
): boolean {
  if (providedSecret === null || expectedSecret === "") {
    return false;
  }

  const providedDigest = createHash("sha256").update(providedSecret).digest();
  const expectedDigest = createHash("sha256").update(expectedSecret).digest();

  return timingSafeEqual(providedDigest, expectedDigest);
}
