import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    TanStackRouterVite(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/data\/manifest\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'manifest-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/data\/.+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lessons-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/audio\/.+\.(mp3|ogg|wav)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: { maxEntries: 500 },
            },
          },
        ],
      },
      manifest: {
        name: 'NihongoBenkyou',
        short_name: 'Nihongo',
        description: 'Japanese vocabulary SRS for Vietnamese learners',
        lang: 'vi',
        theme_color: '#e8e6df',
        background_color: '#e8e6df',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules'))
            return
          if (id.includes('@supabase'))
            return 'vendor-supabase'
          if (id.includes('dexie'))
            return 'vendor-dexie'
          if (id.includes('framer-motion') || id.includes('motion/dist'))
            return 'vendor-motion'
          if (id.includes('howler'))
            return 'vendor-audio'
          // Group React + TanStack + small React-coupled libs together to avoid circular chunks
          if (
            id.includes('/react/')
            || id.includes('/react-dom/')
            || id.includes('@tanstack')
            || id.includes('zustand')
            || id.includes('wanakana')
            || id.includes('scheduler')
          ) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
