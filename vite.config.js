import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: '/debug/index.html',
    cors: true
  },
  build: {
    outDir: 'dist-debug',
    rollupOptions: {
      input: 'debug/index.html'
    }
  },
  optimizeDeps: {
    include: []
  }
})
