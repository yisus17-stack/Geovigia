import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Geovigia',
        short_name: 'Geovigia',
        description: 'Plataforma de auditoría territorial y evidencia satelital',
        theme_color: '#073d2d',
        background_color: '#f5f7f3',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '48x49',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  server: { proxy: { '/agromich-api': { target: 'https://agromich.onrender.com', changeOrigin: true, rewrite: (path) => path.replace(/^\/agromich-api/, '') } } },
})
