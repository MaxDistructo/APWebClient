import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/lib/**",
      "**/src/setupTests.ts",
      "**/src/setupTests.js",
    ],
    coverage: {
      provider: "istanbul",
      exclude: [
        "**/*.test.tsx",
        "**/*.spec.tsx",
        "lib/**",
        "node_modules/**",
        "dist/**",
      ],
    },
    setupFiles: "./test/setup.ts",
    environment: "jsdom",
    globals: true,
  },
});
