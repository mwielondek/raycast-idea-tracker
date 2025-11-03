import path from "node:path";
import { defineConfig } from "vitest/config";

process.env.ROLLUP_SKIP_NODE_REQUIRE = process.env.ROLLUP_SKIP_NODE_REQUIRE ?? "1";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "test/mocks/raycast-api.ts"),
      "@raycast/utils": path.resolve(__dirname, "test/mocks/raycast-utils.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
