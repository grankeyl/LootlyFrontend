import { defineConfig } from "vite";
import { fileURLToPath, URL } from "url";
import { nodePolyfills } from "vite-plugin-node-polyfills";

import vue from "@vitejs/plugin-vue";


export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
      protocolImports: true,
      globals: { Buffer: true, process: true }, // 👈 инжект глобалов
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      buffer: "buffer",
      process: "process/browser",
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
  optimizeDeps: {
    include: ["buffer", "process"],
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