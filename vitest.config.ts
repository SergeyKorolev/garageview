import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["app/javascript/test/setup.ts"],
    include: ["app/javascript/**/*.test.{js,ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app/javascript"),
    },
  },
});
