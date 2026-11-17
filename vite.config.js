import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'ACI Motors Ltd. - Field Force Module',
      short_name: 'ACI Field Force',
      start_url: '/',
      display: 'standalone',
      background_color: '#0A2456',
      theme_color: '#0A2456',
      icons: [{ src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' }]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg}'] }
  })],
  server: { port: 5173 }
})