import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  appType: "mpa",
  base: "",
  build: {
    lib: undefined,
    rolldownOptions: {
      input: ["index.html", "examples/debug/index.html", "examples/harris-v0/index.html"],
      output: {
        assetFileNames: "a/[hash].[ext]",
        chunkFileNames: "a/[hash].js",
        entryFileNames: "a/[hash].js",
      },
    },
  },
  plugins: [solid()],
});
