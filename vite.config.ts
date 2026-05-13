import { defineConfig } from "vite";

export default defineConfig({
  base: "",
  build: {
    lib: undefined,
    rolldownOptions: {
      external: ["fft.js"],
      input: ["index.html", "examples/debug/index.html"],
      output: {
        assetFileNames: "a/[hash].[ext]",
        chunkFileNames: "a/[hash].js",
        entryFileNames: "a/[hash].js",
        paths: {
          "fft.js": "https://esm.unpkg.com/fft.js@4.0.4/lib/fft.js",
        },
      },
    },
  },
});
