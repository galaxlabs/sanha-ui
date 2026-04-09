import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
        target: 'http://localhost:86',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => console.warn('[proxy error]', err.message));
        },
      },
      '/assets': {
        target: 'http://localhost:86',
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: 'http://localhost:86',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
