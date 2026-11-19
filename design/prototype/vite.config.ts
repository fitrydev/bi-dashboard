import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: { fs: { allow: [path.resolve(import.meta.dirname, "..")] } },
  build: { assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 5000 },
});
