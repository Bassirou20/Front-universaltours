
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
    // ⚠️ Pas de manualChunks personnalisés.
    //
    // Les anciens splits (vendor-react / vendor-misc / vendor-icons / ...) cassaient
    // l'ordre de chargement : certains chunks dépendaient de React mais Rollup ne
    // garantissait pas leur ordre dans le HTML, d'où des erreurs runtime du type :
    //   "Cannot read properties of undefined (reading 'createContext')"
    //   "Cannot read properties of undefined (reading '__SECRET_INTERNALS...')"
    //
    // On laisse Vite/Rollup gérer le code splitting tout seul à partir des
    // React.lazy() qui sont déjà en place sur toutes les routes. C'est moins
    // optimal pour le cache cross-deploy, mais c'est FIABLE.
  },
})
