import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Le Jeu du Menteur',
        short_name: 'Menteur',
        description: 'Trahis. Coopère. Survis.',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any',     type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // On laisse le service worker passer les requêtes Socket.IO et l'API directement
        navigateFallbackDenylist: [/^\/socket\.io/, /^\/api/],
        // Le nouveau SW prend le contrôle immédiatement (pas d'attente de
        // fermeture/réouverture de l'app pour avoir la dernière version)
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
})
