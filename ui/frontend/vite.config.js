import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        // Disable proxy-level buffering so SSE frames arrive immediately
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache'
            // Remove content-encoding so Vite doesn't try to decompress SSE
            if (proxyRes.headers['content-type']?.includes('event-stream')) {
              delete proxyRes.headers['content-encoding']
            }
          })
        }
      }
    }
  },

  build: {
    outDir: 'dist',
    // Raise warning threshold slightly — our vendor chunks are intentional
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Fine-grained manual chunks:
        // 1. vue-core  — changes rarely, long cache life
        // 2. i18n      — separate so language files can be lazy-loaded later
        // 3. markdown  — heavyweight deps isolated from app logic
        // 4. vendor    — remaining third-party libs
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (['vue', 'vue-router', 'pinia', 'pinia-plugin-persistedstate'].some(p => id.includes(`/node_modules/${p}/`))) {
              return 'vue-core'
            }
            if (id.includes('/node_modules/vue-i18n/') || id.includes('/node_modules/@intlify/')) {
              return 'i18n'
            }
            if (['marked', 'dompurify', 'highlight.js'].some(p => id.includes(`/node_modules/${p}/`))) {
              return 'markdown'
            }
            return 'vendor'
          }
        }
      }
    }
  },

  // Pre-bundle all heavy deps so cold-start HMR is fast
  optimizeDeps: {
    include: [
      'vue', 'vue-router', 'pinia', 'pinia-plugin-persistedstate',
      'vue-i18n', 'axios', 'marked', 'dompurify', 'highlight.js', 'js-yaml'
    ]
  }
})
