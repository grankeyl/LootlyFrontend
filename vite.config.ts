// vite.config.ts
import mkcert from 'vite-plugin-mkcert'
import vue from '@vitejs/plugin-vue'
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

    proxy: {
      // Клиент ходит на /ws/crash → проксируем на боевой
      '/ws/crash': {
        target: 'https://lootly.codes',   // для WS прокси указываем https, не wss
        changeOrigin: true,
        ws: true,
        // secure: false, // оставь закомментированным, если у lootly.codes валидный cert
        rewrite: p => p.replace(/^\/ws\/crash/, '/api/v0/crash/ws'),
        configure: (proxy) => {
          proxy.on('proxyReqWs', (proxyReq, req) => {
            const url = new URL(req.url!, 'http://x')
            const init = url.searchParams.get('init-data') || ''
            if (init) proxyReq.setHeader('X-Init-Data', init)
            proxyReq.setHeader('Origin', 'https://lootly.codes')
          })
        },
      },
    },
  },
})