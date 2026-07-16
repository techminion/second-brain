import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicEnvironment, getSupabaseServiceRoleEnvironment } from "@/shared/lib/env";

describe("getPublicEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns statically accessed public Supabase values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(getPublicEnvironment()).toEqual({
      supabasePublishableKey: "publishable-key",
      supabaseUrl: "https://project.supabase.co",
    });
  });

  it("fails closed when a public Supabase value is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    expect(() => getPublicEnvironment()).toThrow(
      "Missing required public Supabase environment variables",
    );
  });

  it("loads the service-role client environment without unrelated server secrets", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("EMBEDDING_WEBHOOK_SECRET", "");

    expect(getSupabaseServiceRoleEnvironment()).toEqual({
      supabasePublishableKey: "publishable-key",
      supabaseServiceRoleKey: "service-role-key",
      supabaseUrl: "https://project.supabase.co",
    });
  });
});
