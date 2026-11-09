import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";
import { componentTagger } from "lovable-tagger";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

export default defineConfig(({ mode }) => ({
  root: fileURLToPath(new URL(".", import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          config: fileURLToPath(new URL("./tailwind.config.js", import.meta.url)),
        }),
        autoprefixer(),
      ],
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
