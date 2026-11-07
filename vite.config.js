import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:86'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3005,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3005,
    },
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https'),
        cookieDomainRewrite: 'localhost',
        configure: (proxy) => {
          proxy.on('error', (err) => console.warn('[proxy error]', err.message));
        },
      },
      '/assets': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https'),
        cookieDomainRewrite: 'localhost',
      },
      '/files': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https'),
        cookieDomainRewrite: 'localhost',
      },
    },
  },
})
