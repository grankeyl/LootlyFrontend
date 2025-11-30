// vite.config.ts
import vue from '@vitejs/plugin-vue'
import mkcert from 'vite-plugin-mkcert'

import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({ protocolImports: true, globals: { Buffer: true, process: true } }),
    mkcert({ hosts: ['localhost', '192.168.0.128'] })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
  define: { global: 'globalThis', 'process.env': {} },
  optimizeDeps: { include: ['buffer', 'process'] },

  server: {
    host: true,
    port: 2400,
    hmr: { protocol: 'wss', host: '192.168.0.128', port: 2400 },
  },
})