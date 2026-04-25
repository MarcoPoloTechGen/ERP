import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@fullcalendar")) {
            return "fullcalendar";
          }

          if (id.includes("echarts") || id.includes("zrender")) {
            return "echarts";
          }

          if (id.includes("antd") || id.includes("@ant-design") || id.includes("rc-")) {
            return "antd";
          }

          if (id.includes("@refinedev")) {
            return "refine";
          }

          if (id.includes("@supabase")) {
            return "supabase";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    port: Number(process.env.PORT ?? 5173),
    host: "0.0.0.0",
  },
  preview: {
    port: Number(process.env.PORT ?? 4173),
    host: "0.0.0.0",
  },
});
