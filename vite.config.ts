import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/agromich-api': { target: 'https://agromich.onrender.com', changeOrigin: true, rewrite: (path) => path.replace(/^\/agromich-api/, '') } } },
})
