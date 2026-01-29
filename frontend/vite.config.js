import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1000kB as fallback
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'lucide-react'],
          'vendor-three': ['three'],
          'vendor-gsap': ['gsap']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/auth': 'http://127.0.0.1:5000',
      '/admin': 'http://127.0.0.1:5000',
      '/student': 'http://127.0.0.1:5000',
      '/faculty': 'http://127.0.0.1:5000',
      '/parent': 'http://127.0.0.1:5000',
      '/hrd': 'http://127.0.0.1:5000',
      '/static': 'http://127.0.0.1:5000'
    }
  }
})
