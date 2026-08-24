import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5600,
    proxy: {
      // Forward all /invoice/* and /admin/* to Django backend
      '/invoice': {
        target: 'https://vaishanandj-billing.onrender.com/',
        changeOrigin: true,
      },
      '/admin': {
        target: 'https://vaishanandj-billing.onrender.com/',
        changeOrigin: true,
      },
    },
  },
})
