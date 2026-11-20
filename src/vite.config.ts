import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 1. Prima la regola specifica per le API ufficiali di Sorare
      '/api/sorare': {
        target: 'https://api.sorare.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/sorare/, '/graphql'),
      },
      // 2. Poi la regola generale per il tuo backend locale Express (porta 3000)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/sorare-sessione/**', 'sorare-sessione/**']
    },
  },
});