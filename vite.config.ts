
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  optimizeDeps: {
    entries: ['index.html'],
    include: [
      'react','react-dom','react-router-dom',
      '@tanstack/react-query','axios','lucide-react','clsx','recharts',
      'react-hook-form','zod','@hookform/resolvers'
    ]
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Découpage des dépendances en chunks séparés.
        // → meilleure mise en cache navigateur entre déploiements
        //   (un changement de page n'invalide plus tous les vendors).
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('@tanstack/react-query')) return 'vendor-query'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-forms'
          if (id.includes('axios')) return 'vendor-http'
          if (id.includes('react-dom')) return 'vendor-react-dom'
          if (id.includes('node_modules/react/')) return 'vendor-react'
          // tout le reste des dépendances tierces
          return 'vendor-misc'
        },
      },
    },
  },
})
