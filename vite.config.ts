import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf("echarts") >= 0) {
            return "chart-vendor";
          }
          if (
            id.indexOf("react") >= 0 ||
            id.indexOf("scheduler") >= 0 ||
            id.indexOf("zustand") >= 0
          ) {
            return "app-vendor";
          }
          return undefined;
        },
      },
    },
  },
});
