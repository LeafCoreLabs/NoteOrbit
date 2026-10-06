import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'lucide-react'],
          'vendor-three': ['three'],
          'vendor-gsap': ['gsap'],
          'feature-student': [
            './src/features/student/StudentPanel.jsx',
          ],
          'feature-admin': [
            './src/features/admin/AdminPanel.jsx',
          ],
          'feature-auth': [
            './src/features/auth/UserTypeSelection.jsx',
            './src/features/auth/CredentialsView.jsx',
            './src/features/auth/WelcomeScreen.jsx',
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/student': 'http://127.0.0.1:8000',
      '/students': 'http://127.0.0.1:8000',
      '/attendance': 'http://127.0.0.1:8000',
      '/fees': 'http://127.0.0.1:8000',
      '/demo': 'http://127.0.0.1:8000',
      '/upload-note': 'http://127.0.0.1:8000',
      '/notes': 'http://127.0.0.1:8000',
      '/notices': 'http://127.0.0.1:8000',
      '/create-notice': 'http://127.0.0.1:8000',
      '/register': 'http://127.0.0.1:8000',
      '/login': 'http://127.0.0.1:8000',
      '/me': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/ai': 'http://127.0.0.1:8000',
      '/hostel': 'http://127.0.0.1:8000',
      '/objects': 'http://127.0.0.1:8000',
      '/uploads': 'http://127.0.0.1:8000',
    },
  },
})
