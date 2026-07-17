import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/integration/supabase-test-global-setup.ts"],
    include: ["tests/integration/**/*.test.ts"],
  },
});
