import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { execSync } from 'child_process'
import pkg from './package.json'

// Get git commit SHA for versioning
const getGitSha = () => {
  try {
    // Use Vercel's env var if available, otherwise get from git
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
           execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// Get version - from env var (CI/CD), git tags, or fallback
const getVersion = () => {
  // CI/CD may set this environment variable
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION
  }
  // Try to get from git (works on Vercel)
  try {
    const tag = execSync('git describe --tags --abbrev=0 2>/dev/null').toString().trim()
    if (tag && tag.startsWith('v') && !tag.includes('mobile')) {
      return tag.slice(1)
    }
  } catch { /* no tags */ }
  // Fallback: version from commit count
  try {
    const count = execSync('git rev-list --count HEAD').toString().trim()
    return `1.3.${count}`
  } catch {
    return pkg.version
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
    __GIT_SHA__: JSON.stringify(getGitSha()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Clipchop',
        short_name: 'Clipchop',
        description: 'Split videos for social media',
        theme_color: '#0a0a12',
        background_color: '#0a0a12',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  base: './',
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
