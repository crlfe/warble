/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  appType: "mpa",
  base: "",
  build: {
    lib: undefined,
    rolldownOptions: {
      input: ["index.html", "examples/debug/index.html"],
      output: {
        assetFileNames: "a/[hash].[ext]",
        chunkFileNames: "a/[hash].js",
        entryFileNames: "a/[hash].js",
      },
    },
  },
  plugins: [solid()],
  test: {
    environment: "node",
  },
});
