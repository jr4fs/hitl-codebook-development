import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,//['desiree-flamba-colorfully.ngrok-free.dev', 'all'],
    proxy: {
      '/api': 'http://localhost:8080',
      '/embedding': 'http://localhost:8000',
      '/anonymize': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
      '/inference': 'http://localhost:8000',
    }
  },
})
