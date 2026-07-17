import { describe, expect, it } from "vitest";

import { isWebhookSecretValid, webhookSecretHeaderName } from "@/shared/lib/webhook-auth";

describe("webhook auth", () => {
  it("uses a stable shared-secret header name", () => {
    expect(webhookSecretHeaderName).toBe("x-webhook-secret");
  });

  it("accepts only an exact shared-secret match", () => {
    expect(isWebhookSecretValid("expected-secret", "expected-secret")).toBe(true);
    expect(isWebhookSecretValid("wrong-secret", "expected-secret")).toBe(false);
    expect(isWebhookSecretValid(null, "expected-secret")).toBe(false);
  });
});
