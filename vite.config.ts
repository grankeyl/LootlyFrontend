import { defineConfig } from "vite";
import { fileURLToPath, URL } from "url";

import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 2400,
    proxy: {
      "/api/v1": {
        target: "http://lootly.g4m1.biz",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("X-Pinggy-No-Screen", "1");
          });
        },
      },
    },
  },
});