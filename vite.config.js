import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/cg': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cg/, '/api/v3'),
        headers: { 'x-cg-demo-api-key': 'CG-yZs9Ph6wdBYXyfDu5h6jxj9D' },
      },
    },
  },
})